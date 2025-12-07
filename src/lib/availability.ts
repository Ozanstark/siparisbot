import { prisma } from "@/lib/prisma"

/**
 * Check room availability for a given room type and date range
 */
export async function checkRoomAvailability(
  roomTypeId: string,
  checkIn: Date,
  checkOut: Date,
  roomsNeeded: number = 1
): Promise<{
  available: boolean
  availableRooms: number
  totalRooms: number
  bookedRooms: number
}> {
  // Get room type details
  const roomType = await prisma.roomType.findUnique({
    where: { id: roomTypeId, isActive: true }
  })

  if (!roomType) {
    return {
      available: false,
      availableRooms: 0,
      totalRooms: 0,
      bookedRooms: 0
    }
  }

  // Count overlapping reservations
  // A reservation overlaps if:
  // - Its checkIn is before our checkOut AND
  // - Its checkOut is after our checkIn
  const overlappingReservations = await prisma.reservation.findMany({
    where: {
      roomTypeId,
      status: {
        in: ["PENDING", "CONFIRMED", "CHECKED_IN"] // Exclude cancelled/checked-out
      },
      AND: [
        { checkIn: { lt: checkOut } },
        { checkOut: { gt: checkIn } }
      ]
    },
    select: {
      numberOfRooms: true
    }
  })

  // Sum up all booked rooms in overlapping reservations
  const bookedRooms = overlappingReservations.reduce(
    (sum, reservation) => sum + reservation.numberOfRooms,
    0
  )

  const availableRooms = roomType.totalRooms - bookedRooms

  return {
    available: availableRooms >= roomsNeeded,
    availableRooms: Math.max(0, availableRooms),
    totalRooms: roomType.totalRooms,
    bookedRooms
  }
}

/**
 * Get all available room types for a customer in a given date range
 */
export async function getAvailableRoomTypes(
  customerId: string,
  checkIn: Date,
  checkOut: Date,
  guestsNeeded: number = 1
) {
  // Get all active room types for this customer
  const roomTypes = await prisma.roomType.findMany({
    where: {
      customerId,
      isActive: true,
      maxGuests: { gte: guestsNeeded } // Room must accommodate guests
    }
  })

  // Check availability for each room type
  const availabilityResults = await Promise.all(
    roomTypes.map(async (roomType) => {
      const availability = await checkRoomAvailability(
        roomType.id,
        checkIn,
        checkOut,
        1 // Check for at least 1 room
      )

      return {
        roomType,
        ...availability
      }
    })
  )

  // Return only available room types
  return availabilityResults.filter((result) => result.available)
}

/**
 * Suggest alternative dates if requested room type is not available
 */
export async function suggestAlternativeDates(
  roomTypeId: string,
  preferredCheckIn: Date,
  preferredCheckOut: Date,
  roomsNeeded: number = 1,
  daysToSearch: number = 14 // Search +/- 2 weeks
): Promise<Array<{ checkIn: Date; checkOut: Date; availableRooms: number }>> {
  const alternatives: Array<{
    checkIn: Date
    checkOut: Date
    availableRooms: number
  }> = []

  const stayDuration = Math.ceil(
    (preferredCheckOut.getTime() - preferredCheckIn.getTime()) / (1000 * 60 * 60 * 24)
  )

  // Search for alternative dates within the range
  for (let offset = -daysToSearch; offset <= daysToSearch; offset++) {
    if (offset === 0) continue // Skip the original dates

    const newCheckIn = new Date(preferredCheckIn)
    newCheckIn.setDate(newCheckIn.getDate() + offset)

    const newCheckOut = new Date(newCheckIn)
    newCheckOut.setDate(newCheckOut.getDate() + stayDuration)

    const availability = await checkRoomAvailability(
      roomTypeId,
      newCheckIn,
      newCheckOut,
      roomsNeeded
    )

    if (availability.available) {
      alternatives.push({
        checkIn: newCheckIn,
        checkOut: newCheckOut,
        availableRooms: availability.availableRooms
      })
    }
  }

  // Sort by closest to preferred date
  alternatives.sort((a, b) => {
    const diffA = Math.abs(a.checkIn.getTime() - preferredCheckIn.getTime())
    const diffB = Math.abs(b.checkIn.getTime() - preferredCheckIn.getTime())
    return diffA - diffB
  })

  return alternatives.slice(0, 5) // Return top 5 alternatives
}

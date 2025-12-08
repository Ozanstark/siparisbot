export const CHECK_AVAILABILITY_TOOL = {
    type: "function",
    function: {
        name: "check_availability",
        description: "Check room availability for a given date range and number of guests. Use this whenever a customer asks about room availability, prices, or vacancy. Always ask for check-in and check-out dates if not provided.",
        parameters: {
            type: "object",
            properties: {
                checkIn: {
                    type: "string",
                    description: "Check-in date in YYYY-MM-DD format. If user says 'tomorrow', calculate the date based on current date."
                },
                checkOut: {
                    type: "string",
                    description: "Check-out date in YYYY-MM-DD format."
                },
                guests: {
                    type: "number",
                    description: "Number of guests (adults + children). Default to 2 if not specified."
                },
                roomType: {
                    type: "string",
                    description: "Optional specific room type name (e.g. 'Deluxe', 'Suite')."
                }
            },
            required: ["checkIn", "checkOut", "guests"]
        }
    }
}

export const CREATE_RESERVATION_TOOL = {
    type: "function",
    function: {
        name: "create_reservation",
        description: "Create a new hotel reservation when the customer confirms they want to book. You MUST have checked availability first. You MUST collect guest name and phone number before calling this.",
        parameters: {
            type: "object",
            properties: {
                checkIn: {
                    type: "string",
                    description: "Check-in date in YYYY-MM-DD format."
                },
                checkOut: {
                    type: "string",
                    description: "Check-out date in YYYY-MM-DD format."
                },
                guests: {
                    type: "number",
                    description: "Number of guests."
                },
                roomType: {
                    type: "string",
                    description: "Room type name to book (e.g. 'Standard', 'Deluxe')."
                },
                guestName: {
                    type: "string",
                    description: "Full name of the guest."
                },
                guestPhone: {
                    type: "string",
                    description: "Contact phone number of the guest."
                },
                specialRequests: {
                    type: "string",
                    description: "Any special requests (e.g. 'Late check-in', 'High floor'). Optional."
                }
            },
            required: ["checkIn", "checkOut", "guests", "guestName", "guestPhone", "roomType"]
        }
    }
}

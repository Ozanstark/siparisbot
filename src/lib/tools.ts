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

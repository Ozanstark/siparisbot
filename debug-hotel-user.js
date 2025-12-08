const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const email = 'hotel@hotel.com'
    const user = await prisma.user.findUnique({
        where: { email },
    })
    if (user) {
        console.log('User:', user.email)
        console.log('CustomerType:', user.customerType)
        console.log('Role:', user.role)
    } else {
        console.log('User not found:', email)
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    })

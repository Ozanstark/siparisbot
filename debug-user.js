const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const user = await prisma.user.findFirst({
        orderBy: { createdAt: 'desc' },
    })
    if (user) {
        console.log('Latest User:', user.email)
        console.log('CustomerType:', user.customerType)
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    })

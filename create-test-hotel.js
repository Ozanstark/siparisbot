const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const bcrypt = require('bcryptjs')

async function main() {
    const email = 'test-hotel@demo.com'
    const hashedPassword = await bcrypt.hash('password123', 10)

    // Create user directly to test DB schema
    const user = await prisma.user.create({
        data: {
            email,
            name: 'Test Hotel',
            hashedPassword,
            role: 'CUSTOMER',
            customerType: 'HOTEL',
            organizationId: 'org_123' // Fake, need real one. Let's find one.
        }
    })
    console.log('Created User:', user)
}

// Helper to get org
async function run() {
    const org = await prisma.organization.findFirst()
    if (!org) {
        console.log("No org found")
        return
    }

    // We need to inject org id
    const email = 'test-hotel@demo.com'
    // cleanup first
    try { await prisma.user.delete({ where: { email } }) } catch { }

    const hashedPassword = await bcrypt.hash('password123', 10)
    const user = await prisma.user.create({
        data: {
            email,
            name: 'Test Hotel',
            hashedPassword,
            role: 'CUSTOMER',
            customerType: 'HOTEL',
            organizationId: org.id
        }
    })
    console.log('Created User:', user)
}

run()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    })

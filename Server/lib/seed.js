const bcrypt = require('bcryptjs')
const prisma = require('./prisma')
async function main() {
  const adminEmail = "pepoth00@gmail.com"

  const exists = await prisma.user.findUnique({
    where: { email: adminEmail }
  })

  if (!exists) {
    const hashedPassword = await bcrypt.hash("bonus2548", 10)

    await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        role: "admin"
      }
    })

    console.log("Admin created")
  } else {
    console.log("Admin already exists")
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
  })
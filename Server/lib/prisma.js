const { PrismaClient } = require('@prisma/client')
const { PrismaMariaDb } = require('@prisma/adapter-mariadb')

const adapter = new PrismaMariaDb({
  host: process.env.DB_HOST || process.env.HOST || 'localhost',
  user: process.env.DB_USER || process.env.USER || 'root',
  password: process.env.DB_PASSWORD || process.env.PASSWORD || 'bonus2548',
  database: process.env.DB_NAME || process.env.NAME || 'Licence',
})

const prisma = new PrismaClient({ adapter })

module.exports = prisma

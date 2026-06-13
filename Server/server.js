require('dotenv').config()
// Trigger nodemon restart to load regenerated Prisma Client with PurchaseHistory
const cors = require('cors') 
const express = require('express')
const licenseRouter = require("./routes/license.routes") 
const authRouter = require("./routes/auth.routes") 
const userRouter = require("./routes/user.routes") 
const adminRouter = require("./routes/admin.routes") 
const historyRouter = require("./routes/history.routes") 
const serverRouter = require("./routes/server.routes")
const botConfigRouter = require("./routes/botConfig.routes")

const PORT = process.env.PORT

const app = express()

app.use(cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true
}))
app.use(express.json())

// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now()
    res.on("finish", () => {
        const duration = Date.now() - start
        console.log(`[INFO] ${new Date().toISOString()} - ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - ${duration}ms`)
    })
    next()
})

app.use("/api", licenseRouter);
app.use("/api", authRouter);
app.use("/api", userRouter);
app.use("/api", adminRouter);
app.use("/api", historyRouter);
app.use("/api", serverRouter);
app.use("/api", botConfigRouter);

app.listen(PORT, () => {
    console.log(`🚀 License server running on http://localhost:${PORT}`)
})

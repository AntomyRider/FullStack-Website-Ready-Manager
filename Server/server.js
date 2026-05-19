require('dotenv').config()

const cors = require('cors') 
const express = require('express')
const licenseRouter = require("./routes/licence.routes") 
const authRouter = require("./routes/auth.routes") 
const userRouter = require("./routes/user.routes") 
const adminRouter = require("./routes/admin.routes") 
const historyRouter = require("./routes/history.routes") 
const serverRouter = require("./routes/server.routes")

const PORT = process.env.PORT

const app = express()

app.use(cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true
}))
app.use(express.json())

app.use("/api", licenseRouter);
app.use("/api", authRouter);
app.use("/api", userRouter);
app.use("/api", adminRouter);
app.use("/api", historyRouter);
app.use("/api", serverRouter);

app.listen(PORT, () => {
    console.log(`🚀 License server running on http://localhost:${PORT}`)
})

import express from "express"
import http from "http"
import { Server } from "socket.io"
import mongoose from "mongoose"
import dotenv from "dotenv"
import cookieParser from "cookie-parser"
import cors from "cors"
import { socketHandler } from "./sockets/index.js"
import authRoutes from "./apis/auth.routes.js"
import userRoutes from "./apis/user.routes.js"
import chatRoutes from "./apis/chat.routes.js"
import { protect } from "./middlewares/auth.middleware.js"

// optional (only if you enable redis later)
import { createClient } from "redis"

dotenv.config()

// 🔹 Create express app
const app = express()

// 🔹 Dynamic CORS origins config
const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(",").map(url => url.trim().replace(/\/$/, ""))
    : [];

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, postman, curl)
        if (!origin) return callback(null, true);
        
        const isAllowed = 
            allowedOrigins.includes(origin) ||
            origin.startsWith("http://localhost:") ||
            origin.startsWith("http://127.0.0.1:") ||
            /\.vercel\.app$/.test(origin) ||
            origin.endsWith("vercel.app");
            
        if (isAllowed) {
            callback(null, true);
        } else {
            callback(null, false);
        }
    },
    credentials: true
};

// 🔹 Middleware
app.use(cors(corsOptions))

import path from "path"
import { fileURLToPath } from "url"
const __dirname = path.dirname(fileURLToPath(import.meta.url))
app.use("/uploads", express.static(path.join(__dirname, "uploads")))

app.use(cookieParser())
app.use(express.json())

// PUBLIC ROUTES
app.use("/api/auth", authRoutes)

// PROTECTED ROUTES
app.use("/api/users", protect, userRoutes)
app.use("/api/chats", protect, chatRoutes)
// Create HTTP server
const server = http.createServer(app)

//  Attach Socket.IO
const io = new Server(server, {
    cors: corsOptions
})
socketHandler(io)
app.set("io", io)


// Optional Redis setup
let redisClient = null

const initRedis = async () => {
    if (process.env.USE_REDIS === "true") {
        try {
            redisClient = createClient({
                url: process.env.REDIS_URL
            })

            await redisClient.connect()
            console.log("Redis connected successfully")
        } catch (err) {
            console.error("Redis connection failed:", err)
        }
    }
}

// 🔹 Connect DB + Start Server
const startServer = async () => {
    try {
        await mongoose.connect(process.env.DB_URL)
        console.log("Database connected successfully")

        await initRedis()

        const PORT = process.env.PORT || 5000
        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`)
        })

    } catch (err) {
        console.error("Startup error:", err)
        process.exit(1) // fail fast
    }
}

startServer()

// 🔹 Global Error Handler Middleware
app.use((err, req, res, next) => {
    console.error("Error:", err)
    
    // Multer errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File size exceeds 5MB limit' })
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ message: 'Too many files' })
    }
    
    // Custom validation errors
    if (err.status) {
        return res.status(err.status).json({ message: err.message })
    }
    
    // Cloudinary or other errors
    if (err.message && err.message.includes('Cloudinary')) {
        return res.status(400).json({ message: err.message })
    }
    
    // Default error
    res.status(err.statusCode || 500).json({
        message: err.message || 'Internal server error'
    })
})

// 🔹 404 handler
app.use((req, res) => {
    res.status(404).json({
        message: `Invalid path: ${req.originalUrl}`
    })
})

// 🔹 Error handler
app.use((err, req, res, next) => {
    console.error(err)

    if (err.name === "ValidationError" || err.name === "CastError") {
        return res.status(400).json({
            message: err.message
        })
    }

    res.status(500).json({
        message: "Internal server error"
    })
})

export { io, redisClient }
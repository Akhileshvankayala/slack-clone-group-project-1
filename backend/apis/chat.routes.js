import express from "express"
import { chatModel } from "../models/chatModel.js"
import { messageModel } from "../models/messageModel.js"
import multer from "multer"
import path from "path"

const router = express.Router()

// Multer config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/")
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname))
    }
})
const upload = multer({ storage })

// 🔥 UPLOAD FILE
router.post("/upload", upload.single("file"), (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" })
    
    // Determine file type
    const ext = path.extname(req.file.originalname).toLowerCase()
    let fileType = "file"
    if ([".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)) fileType = "image"
    else if (ext === ".pdf") fileType = "pdf"
    else if ([".mp3", ".wav", ".webm", ".m4a"].includes(ext)) fileType = "audio"

    const fileUrl = `http://localhost:4000/uploads/${req.file.filename}`
    
    res.json({ fileUrl, fileType })
})

// 🔥 CREATE GROUP
router.post("/group", async (req, res, next) => {
    try {
        const userId = req.user.id
        const { groupName, participants } = req.body

        if (!groupName || !participants || participants.length === 0) {
            return res.status(400).json({ message: "Group name and participants are required" })
        }

        const allParticipants = [...new Set([...participants, userId])]

        const chat = await chatModel.create({
            chatId: `group_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            isGroup: true,
            groupName,
            admin: userId,
            participants: allParticipants,
            unreadCount: {}
        })

        res.json({ chat })

    } catch (err) {
        next(err)
    }
})

// 🔥 CREATE CHAT
router.post("/", async (req, res, next) => {
    try {
        const userId = req.user.id
        const { participantId } = req.body

        const chatId = [userId, participantId].sort().join("_")

        let chat = await chatModel.findOne({ chatId })

        if (!chat) {
            chat = await chatModel.create({
                chatId,
                participants: [userId, participantId],
                unreadCount: {}
            })
        }

        res.json({ chat })

    } catch (err) {
        next(err)
    }
})


// 🔥 GET CHATS
router.get("/", async (req, res, next) => {
    try {
        const userId = req.user.id

        const chats = await chatModel.find({
            participants: userId
        })
        .populate("participants", "name email profilePic bio isOnline lastSeen createdAt")
        .populate("lastMessage")
        .sort({ lastMessageAt: -1 })

        res.json({ chats })

    } catch (err) {
        next(err)
    }
})


// 🔥 GET MESSAGES
router.get("/:chatId/messages", async (req, res, next) => {
    try {
        const { chatId } = req.params
        const { page = 1, limit = 20 } = req.query

        const pageNum = parseInt(page)
        const limitNum = parseInt(limit)

        const chat = await chatModel.findOne({ chatId })

        if (!chat || !chat.participants.includes(req.user.id)) {
            return res.status(403).json({ message: "Access denied" })
        }

        const query = { chatId };
        const userClearedAt = chat.clearedAt?.get(req.user.id);
        if (userClearedAt) {
            query.createdAt = { $gt: userClearedAt };
        }

        const messages = await messageModel.find(query)
            .sort({ createdAt: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum)

        res.json({
            messages: messages.reverse()
        })

    } catch (err) {
        next(err)
    }
})

// 🔥 EXIT GROUP
router.post("/:chatId/exit", async (req, res, next) => {
    try {
        const userId = req.user.id
        const { chatId } = req.params

        const chat = await chatModel.findOne({ chatId, isGroup: true })
        if (!chat) return res.status(404).json({ message: "Group chat not found" })

        chat.participants = chat.participants.filter(p => p.toString() !== userId.toString())
        await chat.save()

        res.json({ message: "Left group successfully", chat })

    } catch (err) {
        next(err)
    }
})

// 🔥 CLEAR CHAT
router.delete("/:chatId/messages", async (req, res, next) => {
    try {
        const { chatId } = req.params
        const userId = req.user.id

        const chat = await chatModel.findOne({ chatId })
        if (!chat || !chat.participants.includes(userId)) {
            return res.status(403).json({ message: "Access denied" })
        }

        if (!chat.clearedAt) chat.clearedAt = new Map();
        chat.clearedAt.set(userId, Date.now());

        await chat.save()

        res.json({ message: "Chat cleared successfully" })

    } catch (err) {
        next(err)
    }
})

export default router
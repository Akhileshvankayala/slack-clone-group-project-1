import express from "express"
import { chatModel } from "../models/chatModel.js"
import { messageModel } from "../models/messageModel.js"
import { userModel } from "../models/userModel.js"
import multer from "multer"
import path from "path"
import { promises as fs } from "fs"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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

// UPLOAD FILE
router.post("/upload", upload.single("file"), (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" })
    
    // Determine file type
    const ext = path.extname(req.file.originalname).toLowerCase()
    let fileType = "file"
    if ([".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)) fileType = "image"
    else if (ext === ".pdf") fileType = "pdf"
    else if ([".mp3", ".wav", ".webm", ".m4a"].includes(ext)) fileType = "audio"

    // Resolve backend URL dynamically from process.env or request headers
    const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`
    const fileUrl = `${baseUrl}/uploads/${req.file.filename}`
    
    res.json({ fileUrl, fileType })
})

// GLOBAL SEARCH
router.get("/search", async (req, res, next) => {
    try {
        const userId = req.user.id
        const { q } = req.query

        if (!q || !q.trim()) {
            return res.json({ channels: [], users: [], messages: [] })
        }

        const regex = new RegExp(q.trim(), "i")

        // 1. Search Channels (Groups) where current user is participant
        const channels = await chatModel.find({
            isGroup: true,
            participants: userId,
            groupName: regex
        }).limit(10)

        // 2. Search Users matching query (excluding current user)
        const users = await userModel.find({
            _id: { $ne: userId },
            $or: [
                { name: regex },
                { email: regex }
            ]
        }).select("name email profilePic bio isOnline").limit(10)

        // 3. Search Messages where user is participant of that chat
        const userChats = await chatModel.find({ participants: userId })
        const chatIds = userChats.map(c => c.chatId)

        const messages = await messageModel.find({
            chatId: { $in: chatIds },
            "content.text": regex
        })
        .populate("senderId", "name email profilePic")
        .sort({ createdAt: -1 })
        .limit(20)

        // Format messages to include group info if applicable
        const formattedMessages = messages.map(msg => {
            const chat = userChats.find(c => c.chatId === msg.chatId)
            return {
                _id: msg._id,
                chatId: msg.chatId,
                content: msg.content,
                sender: msg.senderId,
                createdAt: msg.createdAt,
                isGroupChat: chat?.isGroup || false,
                chatName: chat?.isGroup ? chat.groupName : null
            }
        })

        res.json({
            channels,
            users,
            messages: formattedMessages
        })

    } catch (err) {
        next(err)
    }
})

// CREATE GROUP
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

// CREATE CHAT
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


// GET CHATS
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


// GET MESSAGES
router.get("/:chatId/messages", async (req, res, next) => {
    try {
        const { chatId } = req.params
        const { page = 1, limit = 20 } = req.query

        const pageNum = parseInt(page)
        const limitNum = parseInt(limit)

        const chat = await chatModel.findOne({ chatId })
        const userId = req.user.id

        if (!chat || !chat.participants.some(p => p.toString() === userId)) {
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

// EXIT GROUP
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

// ADD PARTICIPANTS
router.post("/:chatId/participants", async (req, res, next) => {
    try {
        const userId = req.user.id
        const { chatId } = req.params
        const { participants } = req.body // Array of user IDs

        console.log(`AddParticipants: userId=${userId}, chatId=${chatId}, participants=${participants}`)

        if (!participants || !Array.isArray(participants)) {
            return res.status(400).json({ message: "Participants array is required" })
        }

        const chat = await chatModel.findOne({ chatId, isGroup: true })
        if (!chat) {
            console.log(`AddParticipants error: Chat ${chatId} not found`)
            return res.status(404).json({ message: "Group chat not found" })
        }

        if (chat.admin.toString() !== userId.toString()) {
            console.log(`AddParticipants forbidden: admin=${chat.admin}, user=${userId}`)
            return res.status(403).json({ message: "Only admin can add participants" })
        }

        // Add new participants, avoiding duplicates
        const existingIds = chat.participants.map(p => p.toString())
        const newParticipants = [...new Set([...existingIds, ...participants])]
        
        const updatedChat = await chatModel.findOneAndUpdate(
            { chatId },
            { participants: newParticipants },
            { new: true }
        ).populate("participants", "name email profilePic bio isOnline lastSeen createdAt")

        console.log("Participants updated successfully")
        res.json({ message: "Participants added successfully", chat: updatedChat })

    } catch (err) {
        console.error(`AddParticipants catch error: ${err.message}`)
        next(err)
    }
})

// REMOVE PARTICIPANT
router.delete("/:chatId/participants/:participantId", async (req, res, next) => {
    try {
        const userId = req.user.id
        const { chatId, participantId } = req.params

        console.log(`RemoveParticipant: userId=${userId}, chatId=${chatId}, participantId=${participantId}`)

        const chat = await chatModel.findOne({ chatId, isGroup: true })
        if (!chat) {
            console.log(`RemoveParticipant error: Chat ${chatId} not found`)
            return res.status(404).json({ message: "Group chat not found" })
        }

        if (chat.admin.toString() !== userId.toString()) {
            console.log(`RemoveParticipant forbidden: admin=${chat.admin}, user=${userId}`)
            return res.status(403).json({ message: "Only admin can remove participants" })
        }

        if (participantId === chat.admin.toString()) {
            return res.status(400).json({ message: "Admin cannot be removed" })
        }

        const newParticipants = chat.participants.filter(p => p.toString() !== participantId)
        
        const updatedChat = await chatModel.findOneAndUpdate(
            { chatId },
            { participants: newParticipants },
            { new: true }
        ).populate("participants", "name email profilePic bio isOnline lastSeen createdAt")

        console.log("Participant removed successfully")
        res.json({ message: "Participant removed successfully", chat: updatedChat })

    } catch (err) {
        console.error(`RemoveParticipant catch error: ${err.message}`)
        next(err)
    }
})

// CLEAR CHAT
router.delete("/:chatId/messages", async (req, res, next) => {
    try {
        const { chatId } = req.params
        const userId = req.user.id

        const chat = await chatModel.findOne({ chatId })
        if (!chat || !chat.participants.some(p => p.toString() === userId)) {
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

// DELETE MESSAGE
router.delete("/:chatId/messages/:messageId", async (req, res, next) => {
    try {
        const { chatId, messageId } = req.params
        const userId = req.user.id

        const chat = await chatModel.findOne({ chatId })
        if (!chat || !chat.participants.some(p => p.toString() === userId)) {
            return res.status(403).json({ message: "Access denied" })
        }

        const message = await messageModel.findById(messageId)
        if (!message || message.chatId !== chatId) {
            return res.status(404).json({ message: "Message not found" })
        }

        if (message.senderId.toString() !== userId.toString()) {
            return res.status(403).json({ message: "You can only delete your own messages" })
        }

        const fileUrl = message.content?.fileUrl
        if (fileUrl) {
            let localPath = null
            
            // Extract local path from URL (e.g., http://localhost:4000/uploads/file.jpg -> /uploads/file.jpg)
            const uploadIndex = fileUrl.indexOf('/uploads/')
            if (uploadIndex !== -1) {
                localPath = fileUrl.substring(uploadIndex)
            } else if (fileUrl.startsWith('uploads/')) {
                localPath = '/' + fileUrl
            }

            if (localPath) {
                // Remove leading slash for safe path.join on Windows
                const cleanPath = localPath.replace(/^\//, "").replace(/^uploads\//, "uploads/")
                const absolutePath = path.join(__dirname, "..", cleanPath)
                console.log(`Deleting file: ${absolutePath}`)
                try {
                    await fs.unlink(absolutePath)
                    console.log("File deleted successfully")
                } catch (err) {
                    console.error(`File deletion failed: ${err.message}`)
                }
            }
        }

        await messageModel.findByIdAndDelete(messageId)

        if (chat.lastMessage?.toString() === messageId) {
            const lastMessage = await messageModel.findOne({ chatId }).sort({ createdAt: -1 })
            chat.lastMessage = lastMessage ? lastMessage._id : null
            chat.lastMessageAt = lastMessage ? lastMessage.createdAt : null
            await chat.save()
        }

        const io = req.app.get("io")
        if (io) {
            io.to(`chat:${chatId}`).emit("message:deleted", {
                messageId,
                chatId
            })
        }

        res.json({ message: "Message deleted successfully", messageId, chatId })
    } catch (err) {
        next(err)
    }
})

// EDIT MESSAGE
router.patch("/:chatId/messages/:messageId", async (req, res, next) => {
    try {
        const { chatId, messageId } = req.params
        const { text } = req.body
        const userId = req.user.id

        if (typeof text !== 'string' || !text.trim()) {
            return res.status(400).json({ message: 'Message text is required' })
        }

        const chat = await chatModel.findOne({ chatId })
        if (!chat || !chat.participants.some(p => p.toString() === userId)) {
            return res.status(403).json({ message: "Access denied" })
        }

        const message = await messageModel.findById(messageId)
        if (!message || message.chatId !== chatId) {
            return res.status(404).json({ message: "Message not found" })
        }

        if (message.senderId.toString() !== userId.toString()) {
            return res.status(403).json({ message: "You can only edit your own messages" })
        }

        message.content.text = text.trim()
        message.edited = true
        message.editedAt = new Date()
        await message.save()

        const io = req.app.get("io")
        if (io) {
            io.to(`chat:${chatId}`).emit("message:updated", {
                message,
                chatId
            })
        }

        res.json({ message: "Message updated successfully", message })
    } catch (err) {
        next(err)
    }
})

export default router
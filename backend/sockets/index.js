import jwt from "jsonwebtoken"
import { messageModel } from "../models/messageModel.js"
import { chatModel } from "../models/chatModel.js"
import { userModel } from "../models/userModel.js"

// 🔹 userId -> Set(socketIds)
const userSocketMap = new Map()

const socketHandler = (io) => {

    io.use((socket, next) => {
        const token = socket.handshake.auth?.token
        if (!token) {
            return next(new Error('Authentication error: token missing'))
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET)
            socket.userId = decoded.id
            next()
        } catch (err) {
            next(new Error('Authentication error: invalid token'))
        }
    })

    io.on("connection", async (socket) => {
        console.log("Socket connected:", socket.id, "userId=", socket.userId)

        try {
            const userId = socket.userId

            // =====================================
            // 🔥 2. USER ↔ SOCKET MAPPING
            // =====================================

            // =====================================
            // 🔥 2. USER ↔ SOCKET MAPPING
            // =====================================
            if (!userSocketMap.has(userId)) {
                userSocketMap.set(userId, new Set())
            }
            userSocketMap.get(userId).add(socket.id)

            // =====================================
            // 🔥 3. JOIN ROOMS
            // =====================================
            socket.join(`user:${userId}`)

            const chats = await chatModel.find({ participants: userId })

            chats.forEach(chat => {
                socket.join(`chat:${chat.chatId}`)
            })

            // =====================================
            // 🔥 4. UPDATE ONLINE STATUS
            // =====================================
            await userModel.findByIdAndUpdate(userId, {
                isOnline: true
            })

            socket.broadcast.emit("user:online", { userId })

            // =====================================
            // 🔥 5. SYNC MISSED MESSAGES (RECONNECT)
            // =====================================
            const unreadMessages = await messageModel.find({
                chatId: { $in: chats.map(c => c.chatId) },
                status: { $ne: "read" },
                senderId: { $ne: userId }
            })

            if (unreadMessages.length > 0) {
                socket.emit("message:sync", unreadMessages)
            }

            // =====================================
            // 🔥 MESSAGE SEND
            // =====================================
            socket.on("message:send", async ({ chatId, content }) => {
                try {
                    if (!chatId || (!content?.text && !content?.fileUrl)) return

                    const chat = await chatModel.findOne({ chatId })
                    if (!chat) return

                    // 🔹 create message
                    const newMessage = await messageModel.create({
                        senderId: userId,
                        chatId,
                        content
                    })

                    // 🔹 delivery check
                    const receiverIds = chat.participants.filter(
                        uid => uid.toString() !== userId.toString()
                    )

                    let isDelivered = false

                    receiverIds.forEach(uid => {
                        const sockets = userSocketMap.get(uid.toString())
                        if (sockets && sockets.size > 0) {
                            isDelivered = true
                        }
                    })

                    if (isDelivered) {
                        newMessage.status = "delivered"
                        await newMessage.save()
                    }

                    // 🔹 update chat
                    chat.lastMessage = newMessage._id
                    chat.lastMessageAt = new Date()

                    chat.participants.forEach((uid) => {
                        if (uid.toString() !== userId.toString()) {
                            const prev = chat.unreadCount.get(uid.toString()) || 0
                            chat.unreadCount.set(uid.toString(), prev + 1)
                        }
                    })

                    await chat.save()

                    // 🔹 emit message
                    io.to(`chat:${chatId}`).emit("message:receive", {
                        message: newMessage,
                        chatId
                    })

                    // 🔹 delivered event
                    if (isDelivered) {
                        socket.to(`chat:${chatId}`).emit("message:delivered", {
                            messageId: newMessage._id,
                            chatId
                        })
                    }

                } catch (err) {
                    console.log("Message send error:", err.message)
                }
            })

            // =====================================
            // READ RECEIPTS
            // =====================================
            socket.on("message:read", async ({ chatId }) => {
                try {
                    if (!chatId) return
                    const userId = socket.userId

                    const chat = await chatModel.findOne({ chatId })
                    if (!chat) return

                    // 1. Reset current user's unread count
                    chat.unreadCount.set(userId.toString(), 0)
                    await chat.save()

                    // 2. Add current user to seenBy array for all messages they haven't seen yet
                    // Only update messages where current user is NOT the sender and NOT in seenBy
                    await messageModel.updateMany(
                        { 
                            chatId, 
                            senderId: { $ne: userId },
                            seenBy: { $ne: userId }
                        },
                        { $addToSet: { seenBy: userId } }
                    )

                    // 3. For all messages in this chat, check if they should be marked as "read"
                    // A message is "read" if everyone except the sender has seen it.
                    // For groups: seenBy.length === chat.participants.length - 1
                    // For 1-on-1: seenBy.length === 1
                    const totalNeeded = chat.participants.length - 1

                    // Find messages that are NOT yet status="read" but have enough seenBy
                    const messagesToMarkAsRead = await messageModel.find({
                        chatId,
                        status: { $ne: "read" },
                        $expr: { $gte: [{ $size: "$seenBy" }, totalNeeded] }
                    })

                    if (messagesToMarkAsRead.length > 0) {
                        const messageIds = messagesToMarkAsRead.map(m => m._id)
                        await messageModel.updateMany(
                            { _id: { $in: messageIds } },
                            { status: "read" }
                        )

                        // Emit "message:read" event for each message that just became fully read
                        // or just emit once for the chat to tell others to refresh
                        io.to(`chat:${chatId}`).emit("message:read:update", {
                            chatId,
                            messageIds,
                            status: "read"
                        })
                    }

                    // Also emit the old event for backward compatibility if needed
                    socket.to(`chat:${chatId}`).emit("message:read", {
                        chatId,
                        userId
                    })

                } catch (err) {
                    console.log("Read error:", err.message)
                }
            })

            // =====================================
            // 🔥 TYPING
            // =====================================
            socket.on("user:typing", ({ chatId }) => {
                socket.to(`chat:${chatId}`).emit("user:typing", {
                    chatId,
                    userId
                })
            })

            socket.on("user:stopTyping", ({ chatId }) => {
                socket.to(`chat:${chatId}`).emit("user:stopTyping", {
                    chatId,
                    userId
                })
            })

            // =====================================
            // 🔥 DISCONNECT
            // =====================================
            socket.on("disconnect", async (reason) => {
                const sockets = userSocketMap.get(userId)

                if (sockets) {
                    sockets.delete(socket.id)

                    if (sockets.size === 0) {
                        userSocketMap.delete(userId)

                        await userModel.findByIdAndUpdate(userId, {
                            isOnline: false,
                            lastSeen: new Date()
                        })

                        io.emit("user:offline", { userId })
                    }
                }

                console.log("Disconnected:", socket.id, "reason=", reason)
            })

        } catch (err) {
            console.log("Socket error:", err.message)
            socket.disconnect()
        }
    })
}

// 🔹 helper
const getUserSockets = (userId) => {
    return userSocketMap.get(userId) || new Set()
}

export { socketHandler, getUserSockets }
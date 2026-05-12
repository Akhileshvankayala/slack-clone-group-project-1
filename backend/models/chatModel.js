import { Schema,model } from "mongoose";

const chatSchema = new Schema({
    chatId: { 
        type: String, 
        unique: true, 
        required: true 
    },
    isGroup: { 
        type: Boolean, 
        default: false 
    },
    groupName: {
        type: String
    },
    admin: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    participants: [{ 
        type: Schema.Types.ObjectId, 
        ref: 'User' 
    }],
    lastMessage: { 
        type: Schema.Types.ObjectId, 
        ref: 'Message' 
    },
    lastMessageAt: { 
        type: Date, 
        default: Date.now 
    },
    // Map allows you to store unread counts as { "userId": count }
    unreadCount: {
        type: Map,
        of: Number,
        default: {}
    },
    clearedAt: {
        type: Map,
        of: Date,
        default: {}
    }
}, { 
    timestamps: true 
});

export const chatModel=model("Chat",chatSchema)
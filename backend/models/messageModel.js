import { Schema,model } from "mongoose";

const messageSchema = new Schema({
    senderId: { 
        type: Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    chatId: { 
        type: String, // Or Schema.Types.ObjectId if referencing a Chat collection
        required: true,
        index: true // Recommended for faster message retrieval
    },
    content: {
        text: { type: String, default: "" },
        fileUrl: { type: String },
        fileType: { type: String }
    },
    timestamp: { 
        type: Date, 
        default: Date.now 
    },
    status: { 
        type: String, 
        enum: ['sent', 'delivered', 'read'], 
        default: 'sent' 
    },
    seenBy: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    edited: {
        type: Boolean,
        default: false
    },
    editedAt: {
        type: Date
    }
},{
    timestamps:true,
});

export const messageModel=model("Message",messageSchema)
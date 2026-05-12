import { Schema,model } from "mongoose";
const userSchema=new Schema({
    name:{
        type:String,
        required:[true,"name is required"]
    },
    email:{
        type:String,
        required:[true,"email is required"],
        unique:[true,"email already existed"]
    },
    password:{
        type:String,
        required:[true,"password required"]
    },
    isOnline:{
        type:Boolean,
        default:false
    },
    lastSeen: {
        type: Date, 
        default: Date.now 
    },
    blockedUsers: [{
        type: Schema.Types.ObjectId,
        ref: "User"
    }],
    profilePic: {
        type: String,
        default: ""
    },
    bio: {
        type: String,
        default: ""
    }
},{
    timestamps:true
});

export const userModel=model("User",userSchema)
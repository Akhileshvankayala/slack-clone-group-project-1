import express from "express"
import { userModel } from "../models/userModel.js"
import { upload, uploadToCloudinary } from "../config/multer-cloudinary.js"
import { promises as fs } from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

// 🔥 SEARCH USERS
router.get("/", async (req, res, next) => {
    try {
        const { search } = req.query

        const users = await userModel.find({
            name: { $regex: search || "", $options: "i" }
        }).select("-password")

        res.json({ users })

    } catch (err) {
        next(err)
    }
})

// 🔥 UPDATE PROFILE
router.put("/profile", upload.single("profilePic"), async (req, res, next) => {
    try {
        const userId = req.user.id
        const { name, bio } = req.body
        
        // Validate required fields
        if (!name || !name.trim()) {
            return res.status(400).json({ message: "Name is required" })
        }
        
        let updateData = { 
            name: name.trim(), 
            bio: bio ? bio.trim() : "" 
        }
        
        // Handle file upload to Cloudinary with local storage fallback
        if (req.file) {
            try {
                console.log("Uploading file to Cloudinary:", req.file.mimetype)
                const result = await uploadToCloudinary(req.file.buffer)
                
                if (!result || !result.secure_url) {
                    throw new Error("Failed to get secure URL from Cloudinary")
                }
                
                updateData.profilePic = result.secure_url
                console.log("File uploaded successfully to Cloudinary:", result.secure_url)
            } catch (uploadErr) {
                console.warn("Cloudinary upload failed, using local storage fallback:", uploadErr.message)
                
                try {
                    // Local fallback
                    const ext = path.extname(req.file.originalname) || ".jpg"
                    const filename = `profile_${Date.now()}${ext}`
                    const uploadDir = path.join(__dirname, "../uploads")
                    
                    // Ensure uploads directory exists
                    await fs.mkdir(uploadDir, { recursive: true })
                    
                    const filePath = path.join(uploadDir, filename)
                    await fs.writeFile(filePath, req.file.buffer)
                    
                    updateData.profilePic = `/uploads/${filename}`
                    console.log("File saved to local storage fallback successfully:", updateData.profilePic)
                } catch (fallbackErr) {
                    console.error("Local storage fallback failed:", fallbackErr)
                    return res.status(400).json({ 
                        message: `Upload failed: ${uploadErr.message}. Local backup also failed: ${fallbackErr.message}` 
                    })
                }
            }
        }

        const user = await userModel.findByIdAndUpdate(userId, updateData, { new: true }).select("-password")

        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }

        res.json({ 
            message: "Profile updated successfully", 
            user 
        })

    } catch (err) {
        console.error("Profile update error:", err)
        next(err)
    }
})

// 🔥 BLOCK USER
router.post("/block", async (req, res, next) => {
    try {
        const userId = req.user.id
        const { blockUserId } = req.body

        const user = await userModel.findById(userId)
        if (!user.blockedUsers.includes(blockUserId)) {
            user.blockedUsers.push(blockUserId)
            await user.save()
        }

        res.json({ message: "User blocked successfully", blockedUsers: user.blockedUsers })

    } catch (err) {
        next(err)
    }
})

export default router
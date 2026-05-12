import express from "express"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { userModel } from "../models/userModel.js"

const router = express.Router()

// 🔥 SIGNUP
router.post("/signup", async (req, res, next) => {
    try {
        const { name, email, password } = req.body

        const existing = await userModel.findOne({ email })
        if (existing) {
            return res.status(400).json({ message: "User already exists" })
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const user = await userModel.create({
            name,
            email,
            password: hashedPassword
        })

        res.json({ message: "User created", user })

    } catch (err) {
        next(err)
    }
})

// 🔥 LOGIN
router.post("/login", async (req, res, next) => {
    try {
        const { email, password } = req.body

        const user = await userModel.findOne({ email })
        if (!user) {
            return res.status(400).json({ message: "Invalid credentials" })
        }

        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" })
        }

        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        )

        res.json({ token, user })

    } catch (err) {
        next(err)
    }
})

export default router
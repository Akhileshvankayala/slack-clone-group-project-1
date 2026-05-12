/**
 * DEBUG FILE: Cloudinary Configuration Test
 * This file helps verify that Cloudinary credentials are properly configured
 * To use: Uncomment and run this file, then check the output
 */

import dotenv from "dotenv"
dotenv.config()

console.log("\n=== Cloudinary Configuration Check ===")
console.log("Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME ? "✓ Set" : "✗ Missing")
console.log("API Key:", process.env.CLOUDINARY_API_KEY ? "✓ Set" : "✗ Missing")
console.log("API Secret:", process.env.CLOUDINARY_API_SECRET ? "✓ Set" : "✗ Missing")

if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error("\n❌ Missing Cloudinary credentials in .env file!")
  console.log("Please add these to your .env:")
  console.log("  CLOUDINARY_CLOUD_NAME=your_cloud_name")
  console.log("  CLOUDINARY_API_KEY=your_api_key")
  console.log("  CLOUDINARY_API_SECRET=your_api_secret")
} else {
  console.log("\n✅ All Cloudinary credentials are configured!")
  
  // Test connection
  import cloudinary from "./cloudinary.js"
  
  cloudinary.api.ping((err, result) => {
    if (err) {
      console.error("❌ Cloudinary connection failed:", err.message)
    } else {
      console.log("✅ Cloudinary connection successful!")
      console.log("Response:", result)
    }
  })
}

console.log("=====================================\n")

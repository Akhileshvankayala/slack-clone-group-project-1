import cloudinary from "./cloudinary.js";

/**
 * Upload to Cloudinary
 * Converts a file buffer into a stream and uploads it to Cloudinary
 * @param {Buffer} buffer - The image data buffer from Multer
 * @param {string} folder - Destination folder in Cloudinary (optional)
 * @returns {Promise} - Resolves with the Cloudinary upload result or rejects with an error
 */
export const uploadToCloudinary = (buffer, folder = "chat_app_profiles") => {
  return new Promise((resolve, reject) => {
    if (!buffer) {
      return reject(new Error("No file buffer provided"));
    }

    // Create an upload stream to pipe the buffer directly to Cloudinary
    const stream = cloudinary.uploader.upload_stream(
      { 
        folder: folder,
        resource_type: "auto",
        quality: "auto",
        fetch_format: "auto",
      },
      (err, result) => {
        if (err) {
          console.error("Cloudinary upload error:", err);
          return reject(new Error(`Cloudinary upload failed: ${err.message}`));
        }
        
        if (!result || !result.secure_url) {
          return reject(new Error("Cloudinary upload returned invalid response"));
        }
        
        resolve(result);
      }
    );

    // Handle stream errors
    stream.on("error", (err) => {
      console.error("Stream error:", err);
      reject(new Error(`Upload stream error: ${err.message}`));
    });

    // Write the buffer to the stream and signal completion
    stream.end(buffer);
  });
};

/**
 * Delete from Cloudinary
 * Deletes an image from Cloudinary using its public ID
 * @param {string} publicId - The public ID of the resource in Cloudinary
 * @returns {Promise} - Resolves when deletion is complete
 */
export const deleteFromCloudinary = (publicId) => {
  return new Promise((resolve, reject) => {
    if (!publicId) {
      return reject(new Error("No public ID provided"));
    }

    cloudinary.uploader.destroy(publicId, (err, result) => {
      if (err) {
        console.error("Cloudinary delete error:", err);
        return reject(new Error(`Cloudinary delete failed: ${err.message}`));
      }
      resolve(result);
    });
  });
};

/**
 * Extract Public ID from Cloudinary URL
 * @param {string} url - The secure URL from Cloudinary
 * @returns {string} - The public ID
 */
export const getPublicIdFromUrl = (url) => {
  if (!url) return null;
  const match = url.match(/\/([^/]+)$/);
  return match ? match[1].split(".")[0] : null;
};

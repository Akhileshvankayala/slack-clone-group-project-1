/**
 * Centralized API & URL resolve configuration for Slack Clone Production deployment.
 */

export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

/**
 * Resolves profile picture URL correctly, handling absolute, relative, and Cloudinary URLs.
 * @param {string} profilePic - Profile picture field
 * @returns {string|null} - Full profile picture URL
 */
export const getProfilePicUrl = (profilePic) => {
  if (!profilePic) return null;
  if (profilePic.startsWith("http")) {
    // If it's a Cloudinary link or legacy absolute URL containing localhost, check if we need to redirect it
    if (profilePic.startsWith("http://localhost:4000")) {
      return profilePic.replace("http://localhost:4000", API_BASE_URL);
    }
    return profilePic;
  }
  
  // Handle relative server uploads, ensure slash formatting
  const slash = profilePic.startsWith("/") ? "" : "/";
  return `${API_BASE_URL}${slash}${profilePic}`;
};

/**
 * Normalizes user attachments or file URLs to map localhost to production if required.
 * @param {string} url - Uploaded file URL
 * @returns {string} - Clean URL
 */
export const getFileUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http://localhost:4000")) {
    return url.replace("http://localhost:4000", API_BASE_URL);
  }
  return url;
};

import { useState, useRef } from 'react'
import { useAuthStore } from '../stores/authStore'
import { ArrowLeft, Camera, Check, User, Info, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Profile({ onClose }) {
  const { user, updateProfile, isLoading } = useAuthStore()
  const [name, setName] = useState(user.name)
  const [bio, setBio] = useState(user.bio || '')
  const [selectedImage, setSelectedImage] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const fileInputRef = useRef(null)

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB')
        return
      }
      setSelectedImage(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Name cannot be empty')
      return
    }

    const formData = new FormData()
    formData.append('name', name.trim())
    formData.append('bio', bio.trim())
    
    // Only add file if one was selected
    if (selectedImage) {
      formData.append('profilePic', selectedImage, selectedImage.name)
    }

    // Log for debugging
    console.log('Uploading profile:', {
      name: name.trim(),
      bio: bio.trim(),
      hasFile: !!selectedImage,
      fileSize: selectedImage?.size,
      fileMime: selectedImage?.type
    })

    const result = await updateProfile(formData)
    if (result.success) {
      toast.success('Profile updated successfully')
      setSelectedImage(null)
      setPreviewUrl(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } else {
      toast.error(result.message || 'Failed to update profile')
    }
  }

  const getProfileUrl = () => {
    if (previewUrl) return previewUrl
    if (user.profilePic) {
      // Check if it's a Cloudinary URL (starts with http) or local URL
      return user.profilePic.startsWith('http') ? user.profilePic : `http://localhost:4000${user.profilePic}`
    }
    return null
  }

  return (
    <div className="flex flex-col h-full bg-gray-100 animate-in slide-in-from-left duration-300">
      {/* Header */}
      <div className="bg-primary text-white h-28 px-4 flex items-end pb-4 gap-6">
        <button onClick={onClose} className="hover:bg-primary-dark p-2 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-semibold mb-1">Profile</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-8">
        {/* Profile Picture */}
        <div className="flex justify-center py-8 bg-white shadow-sm mb-6">
          <div className="relative group">
            <div className="w-48 h-48 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-4 border-gray-50 shadow-md">
              {getProfileUrl() ? (
                <img src={getProfileUrl()} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="text-gray-400 font-bold text-6xl">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 flex flex-col items-center justify-center rounded-full transition-all text-transparent group-hover:text-white cursor-pointer"
            >
              <Camera size={32} />
              <span className="text-xs mt-2 uppercase font-semibold">Change Photo</span>
            </button>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageChange} 
              accept="image/*" 
              className="hidden" 
            />
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-6">
          {/* Name Field */}
          <div className="bg-white p-4 px-8 shadow-sm">
            <div className="flex items-center gap-6 mb-2">
              <User size={20} className="text-primary" />
              <div className="flex-1">
                <label className="block text-xs text-primary font-medium mb-1 uppercase tracking-wider">Your Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border-b border-transparent focus:border-primary py-1 outline-none text-gray-800 text-lg transition-colors"
                  placeholder="Enter your name"
                />
              </div>
              <button className="text-gray-400 hover:text-primary">
                <Check size={20} />
              </button>
            </div>
            <p className="text-xs text-gray-500 ml-11">This is not your username or pin. This name will be visible to your WhatsApp contacts.</p>
          </div>

          {/* Bio Field */}
          <div className="bg-white p-4 px-8 shadow-sm">
            <div className="flex items-center gap-6 mb-2">
              <Info size={20} className="text-primary" />
              <div className="flex-1">
                <label className="block text-xs text-primary font-medium mb-1 uppercase tracking-wider">About</label>
                <textarea 
                  value={bio} 
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full border-b border-transparent focus:border-primary py-1 outline-none text-gray-800 text-lg transition-colors resize-none"
                  placeholder="Tell something about yourself"
                  rows={1}
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="px-8 mt-8">
            <button 
              onClick={handleSave}
              disabled={isLoading}
              className="w-full bg-secondary hover:bg-green-600 text-white font-bold py-3 rounded-lg shadow-md transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Profile'
              )}
            </button>
          </div>
        </div>
      </div>
      
      <div className="bg-gray-100 p-8 text-center text-sm text-gray-500">
        <p>Your profile info is visible to people you chat with.</p>
      </div>
    </div>
  )
}

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
    
    if (selectedImage) {
      formData.append('profilePic', selectedImage, selectedImage.name)
    }

    console.log('Uploading profile:', {
      name: name.trim(),
      bio: bio.trim(),
      hasFile: !!selectedImage,
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
      return user.profilePic.startsWith('http') ? user.profilePic : `http://localhost:4000${user.profilePic}`
    }
    return null
  }

  return (
    <div className="flex flex-col h-full bg-white animate-in slide-in-from-left duration-200">
      {/* Header */}
      <div className="h-14 bg-white border-b border-gray-200 px-6 flex items-center gap-3">
        <button onClick={onClose} className="hover:bg-gray-100 p-1.5 rounded-md transition-colors text-gray-650">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-sm font-bold text-gray-900">Edit Profile</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-8 px-6 pt-6">
        {/* Profile Picture */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative group">
            <div className="w-36 h-36 rounded-lg bg-slack-purple text-white flex items-center justify-center overflow-hidden border border-gray-250 shadow-xs select-none">
              {getProfileUrl() ? (
                <img src={getProfileUrl()} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="font-bold text-5xl">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 bg-black/0 group-hover:bg-black/50 flex flex-col items-center justify-center rounded-lg transition-all text-transparent group-hover:text-white cursor-pointer"
            >
              <Camera size={24} />
              <span className="text-[10px] mt-1.5 uppercase font-bold tracking-wider">Change Photo</span>
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
        <div className="space-y-6 pt-4 border-t border-gray-100 max-w-md mx-auto">
          {/* Name Field */}
          <div className="space-y-1">
            <label className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider select-none">Display Name</label>
            <div className="flex items-center gap-2 border border-gray-300 rounded px-3 py-1.5 focus-within:border-gray-400 focus-within:ring-1 focus-within:ring-gray-300">
              <User size={16} className="text-gray-400" />
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                className="flex-1 outline-none text-gray-800 text-sm bg-transparent"
                placeholder="Enter your display name"
              />
            </div>
            <p className="text-[10px] text-gray-500 font-medium select-none">This name will be visible to other members in your workspace.</p>
          </div>

          {/* Bio Field */}
          <div className="space-y-1">
            <label className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider select-none">About Me (Bio)</label>
            <div className="flex items-start gap-2 border border-gray-300 rounded px-3 py-2 focus-within:border-gray-400 focus-within:ring-1 focus-within:ring-gray-300">
              <Info size={16} className="text-gray-400 mt-0.5" />
              <textarea 
                value={bio} 
                onChange={(e) => setBio(e.target.value)}
                className="flex-1 outline-none text-gray-800 text-sm bg-transparent resize-none h-20"
                placeholder="Tell something about yourself..."
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-2">
            <button 
              onClick={handleSave}
              disabled={isLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-500 text-white font-bold py-2.5 rounded transition-colors flex items-center justify-center gap-2 text-sm shadow-xs cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving changes...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { ArrowLeft, MapPin, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function UserProfile({ user, onClose }) {
  const [imageLoadError, setImageLoadError] = useState(false)

  if (!user) return null

  const getProfilePicUrl = () => {
    if (!user.profilePic) return null
    
    // If it's a full URL (from Cloudinary), use it directly
    if (user.profilePic.startsWith('http')) {
      return user.profilePic
    }
    
    // If it's a local path, prepend the server URL
    if (user.profilePic.startsWith('/')) {
      return `http://localhost:4000${user.profilePic}`
    }
    
    return null
  }

  const getStatusText = () => {
    if (user.isOnline) return 'Online'
    if (user.lastSeen) return `Last seen ${formatDistanceToNow(new Date(user.lastSeen), { addSuffix: true })}`
    return 'Offline'
  }

  const getStatusColor = () => {
    return user.isOnline ? 'text-green-600' : 'text-gray-500'
  }

  const profileUrl = getProfilePicUrl()

  return (
    <div className="flex flex-col h-full bg-gray-100 animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="bg-primary text-white h-20 px-4 flex items-end pb-4 gap-4">
        <button 
          onClick={onClose} 
          className="hover:bg-primary-dark p-2 rounded-full transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-semibold mb-1">Profile</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-8">
        {/* Profile Picture */}
        <div className="flex justify-center py-8 bg-white shadow-sm mb-6">
          <div className="w-48 h-48 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center overflow-hidden border-4 border-gray-50 shadow-md">
            {profileUrl && !imageLoadError ? (
              <img 
                src={profileUrl} 
                alt={user.name} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.error("Image load error:", e)
                  setImageLoadError(true)
                }}
              />
            ) : (
              <div className="text-white font-bold text-6xl">
                {user.name?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* User Details */}
        <div className="space-y-4 px-4">
          {/* Name */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h2 className="text-2xl font-bold text-gray-800 mb-1">{user.name}</h2>
            <div className={`flex items-center gap-2 text-sm font-medium ${getStatusColor()}`}>
              <div className={`w-2 h-2 rounded-full ${user.isOnline ? 'bg-green-600' : 'bg-gray-400'}`}></div>
              {getStatusText()}
            </div>
          </div>

          {/* Email */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <label className="block text-xs text-primary font-semibold mb-2 uppercase tracking-wider">Email</label>
            <p className="text-gray-700 break-all text-sm">{user.email}</p>
          </div>

          {/* Bio */}
          {user.bio && (
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <label className="block text-xs text-primary font-semibold mb-2 uppercase tracking-wider">About</label>
              <p className="text-gray-700 whitespace-pre-wrap break-words text-sm">{user.bio}</p>
            </div>
          )}

          {/* Status Info */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <Clock size={18} className="text-primary" />
              <div>
                <label className="block text-xs text-primary font-semibold mb-1 uppercase tracking-wider">Status</label>
                <p className={`text-sm font-medium ${getStatusColor()}`}>
                  {user.isOnline ? '🟢 Online' : '⚫ Offline'}
                </p>
              </div>
            </div>
            {user.lastSeen && !user.isOnline && (
              <p className="text-xs text-gray-500 ml-7">
                Last active {formatDistanceToNow(new Date(user.lastSeen), { addSuffix: true })}
              </p>
            )}
          </div>

          {/* Member Since */}
          {user.createdAt && (
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <label className="block text-xs text-primary font-semibold mb-2 uppercase tracking-wider">Member Since</label>
              <p className="text-gray-700 text-sm">
                {new Date(user.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { ArrowLeft, Clock, Mail, Info, Calendar } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { getProfilePicUrl } from '../config'

export default function UserProfile({ user, onClose }) {
  const [imageLoadError, setImageLoadError] = useState(false)

  if (!user) return null

  const getStatusText = () => {
    if (user.isOnline) return 'Online'
    if (user.lastSeen) return `Last seen ${formatDistanceToNow(new Date(user.lastSeen), { addSuffix: true })}`
    return 'Offline'
  }

  const profileUrl = getProfilePicUrl(user.profilePic)

  return (
    <div className="flex flex-col h-full bg-white animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="h-14 bg-white border-b border-gray-200 px-6 flex items-center gap-3">
        <button 
          onClick={onClose} 
          className="hover:bg-gray-105 p-1.5 rounded-md transition-colors text-gray-650"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-sm font-bold text-gray-900">User Profile</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-8 px-6 pt-6">
        {/* Profile Picture */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-36 h-36 rounded-lg bg-slack-purple text-white flex items-center justify-center overflow-hidden border border-gray-250 shadow-xs select-none">
            {profileUrl && !imageLoadError ? (
              <img 
                src={profileUrl} 
                alt={user.name} 
                className="w-full h-full object-cover"
                onError={() => setImageLoadError(true)}
              />
            ) : (
              <div className="font-bold text-5xl">
                {user.name?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          
          <h2 className="text-xl font-bold text-gray-900 mt-4 mb-1">{user.name}</h2>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
            <span className={`w-2.5 h-2.5 rounded-full ${user.isOnline ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
            {getStatusText()}
          </div>
        </div>

        {/* User Details */}
        <div className="space-y-4 pt-4 border-t border-gray-100">
          {/* Email */}
          <div className="flex items-start gap-3">
            <Mail size={16} className="text-gray-450 mt-0.5 flex-shrink-0" />
            <div>
              <label className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5 select-none">Email Address</label>
              <p className="text-sm text-gray-805 break-all">{user.email}</p>
            </div>
          </div>

          {/* Bio */}
          {user.bio && (
            <div className="flex items-start gap-3">
              <Info size={16} className="text-gray-450 mt-0.5 flex-shrink-0" />
              <div>
                <label className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5 select-none">About</label>
                <p className="text-sm text-gray-805 whitespace-pre-wrap break-words">{user.bio}</p>
              </div>
            </div>
          )}

          {/* Member Since */}
          {user.createdAt && (
            <div className="flex items-start gap-3">
              <Calendar size={16} className="text-gray-450 mt-0.5 flex-shrink-0" />
              <div>
                <label className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5 select-none">Member Since</label>
                <p className="text-sm text-gray-805">
                  {new Date(user.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import { useChatStore } from '../stores/chatStore'
import { useAuthStore } from '../stores/authStore'
import { ArrowLeft, Send, MoreVertical, Paperclip, Check, CheckCheck, Mic, Square, Users, FileText, Image as ImageIcon, Search, X, LogOut, Ban } from 'lucide-react'
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns'
import { api } from '../stores/authStore'
import { useSocketStore } from '../stores/socketStore'
import UserProfile from './UserProfile'

export default function ChatWindow() {
  const { user } = useAuthStore()
  const { activeChat, setActiveChat, messages, sendMessage, uploadFile, isLoadingMessages, typingUsers, setTyping } = useChatStore()
  
  const [text, setText] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  
  const [showMenu, setShowMenu] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showMembers, setShowMembers] = useState(false)
  const [enlargedMedia, setEnlargedMedia] = useState(null)
  const [showUserProfile, setShowUserProfile] = useState(false)
  
  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const fileInputRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const timerRef = useRef(null)

  const other = activeChat?.isGroup ? null : (activeChat?.participants.find(p => p._id !== user._id) || activeChat?.participants[0])
  const isTyping = activeChat?.isGroup 
    ? (typingUsers[activeChat?.chatId]?.size > 0)
    : typingUsers[activeChat?.chatId]?.has(other?._id)

  const scrollToBottom = () => {
    if (!searchQuery) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
    }
  }, [])

  const handleSend = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    sendMessage(activeChat.chatId, text.trim())
    setText('')
    
    const { socket } = useSocketStore.getState()
    if (socket) {
      socket.emit('user:stopTyping', { chatId: activeChat.chatId })
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setIsUploading(true)
    const result = await uploadFile(file)
    setIsUploading(false)
    if (result) {
      sendMessage(activeChat.chatId, '', result.fileUrl, result.fileType)
    }
    e.target.value = '' // reset input
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      audioChunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const audioFile = new File([audioBlob], `audio_${Date.now()}.webm`, { type: 'audio/webm' })
        
        setIsUploading(true)
        const result = await uploadFile(audioFile)
        setIsUploading(false)
        
        if (result) {
          sendMessage(activeChat.chatId, '', result.fileUrl, 'audio')
        }
        
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)
      setRecordingTime(0)
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } catch (err) {
      console.error("Error accessing microphone:", err)
      alert("Could not access microphone.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      clearInterval(timerRef.current)
    }
  }

  const handleTyping = (e) => {
    setText(e.target.value)
    
    const { socket } = useSocketStore.getState()
    if (!socket) return

    socket.emit('user:typing', { chatId: activeChat.chatId })

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('user:stopTyping', { chatId: activeChat.chatId })
    }, 2000)
  }

  const handleExitGroup = async () => {
    if(window.confirm("Are you sure you want to leave this group?")) {
      try {
        await api.post(`/chats/${activeChat.chatId}/exit`)
        setActiveChat(null)
        useChatStore.getState().fetchChats()
      } catch(err) {
        console.error(err)
      }
    }
  }

  const handleClearChat = async () => {
    if(window.confirm("Are you sure you want to clear this chat? This cannot be undone.")) {
      try {
        await api.delete(`/chats/${activeChat.chatId}/messages`)
        useChatStore.getState().fetchMessages(activeChat.chatId)
        setShowMenu(false)
      } catch(err) {
        console.error(err)
      }
    }
  }

  const handleBlockUser = async () => {
    const isBlocked = user.blockedUsers?.includes(other?._id)
    if(window.confirm(`Are you sure you want to ${isBlocked ? 'unblock' : 'block'} this user?`)) {
      try {
        const res = await api.post('/users/block', { blockUserId: other._id })
        useAuthStore.getState().updateUser({ blockedUsers: res.data.blockedUsers })
        alert(res.data.message)
        setShowMenu(false)
      } catch(err) {
        console.error(err)
      }
    }
  }

  const getStatusText = () => {
    if (isTyping) return 'typing...'
    if (activeChat.isGroup) return `${activeChat.participants.length} participants`
    if (other?.isOnline) return 'online'
    if (other?.lastSeen) return `last seen ${formatDistanceToNow(new Date(other.lastSeen), { addSuffix: true })} (offline)`
    return 'offline'
  }

  const formatMessageTime = (dateStr) => {
    return format(new Date(dateStr), 'HH:mm')
  }

  const renderDateSeparator = (date) => {
    let dateText = format(date, 'dd/MM/yyyy')
    if (isToday(date)) dateText = 'TODAY'
    else if (isYesterday(date)) dateText = 'YESTERDAY'

    return (
      <div className="flex justify-center my-4">
        <div className="bg-white px-3 py-1 rounded-lg shadow-sm text-xs text-gray-500 uppercase tracking-wider font-medium">
          {dateText}
        </div>
      </div>
    )
  }

  const renderStatus = (msg) => {
    if (msg.senderId !== user._id) return null
    if (msg.status === 'sent') return <Check size={14} className="text-gray-400" />
    if (msg.status === 'delivered') return <CheckCheck size={14} className="text-gray-400" />
    if (msg.status === 'read') return <CheckCheck size={14} className="text-blue-500" />
    return null
  }

  const renderFile = (msg) => {
    if (!msg.content.fileUrl) return null
    const { fileUrl, fileType } = msg.content
    
    if (fileType === 'image') {
      return <img onClick={() => setEnlargedMedia({ url: fileUrl, type: 'image' })} src={fileUrl} alt="attachment" className="max-w-[200px] sm:max-w-[300px] rounded-lg mb-1 cursor-pointer hover:opacity-90 transition" />
    } else if (fileType === 'audio') {
      return <audio controls src={fileUrl} className="max-w-[200px] sm:max-w-[250px] mb-1" />
    } else if (fileType === 'pdf') {
      return (
        <div onClick={() => setEnlargedMedia({ url: fileUrl, type: 'pdf' })} className="flex items-center gap-2 bg-gray-100 p-3 rounded-lg mb-1 hover:bg-gray-200 transition cursor-pointer">
          <FileText size={24} className="text-red-500" />
          <span className="text-sm underline text-blue-600 truncate max-w-[150px]">View PDF</span>
        </div>
      )
    } else {
      return (
        <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-gray-100 p-3 rounded-lg mb-1 hover:bg-gray-200 transition">
          <FileText size={24} className="text-red-500" />
          <span className="text-sm underline text-blue-600 truncate max-w-[150px]">View Document</span>
        </a>
      )
    }
  }

  if (!activeChat) return null

  const displayName = activeChat.isGroup ? activeChat.groupName : other?.name
  const initial = displayName?.charAt(0).toUpperCase()

  const displayedMessages = searchQuery 
    ? messages.filter(m => m.content?.text?.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages

  return (
    <div className="flex flex-col h-full bg-chat-bg relative">
      {/* Enlarged Media Modal */}
      {enlargedMedia && (
        <div className="absolute inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <button onClick={() => setEnlargedMedia(null)} className="absolute top-4 right-4 text-white p-2 hover:bg-white/20 rounded-full">
            <X size={24} />
          </button>
          {enlargedMedia.type === 'image' ? (
            <img src={enlargedMedia.url} className="max-w-full max-h-full object-contain" />
          ) : (
            <iframe src={enlargedMedia.url} className="w-full h-full bg-white" />
          )}
        </div>
      )}

      {/* User Profile Modal */}
      {showUserProfile && !activeChat.isGroup && (
        <div className="absolute inset-0 bg-white z-[60] flex flex-col h-full">
          <UserProfile user={other} onClose={() => setShowUserProfile(false)} />
        </div>
      )}

      {/* Members Modal */}
      {showMembers && activeChat.isGroup && (
        <div className="absolute top-16 left-16 bg-white shadow-lg border rounded-lg p-2 z-30 min-w-[200px]">
          <div className="flex justify-between items-center px-2 mb-2">
            <h3 className="text-xs font-bold text-gray-500 uppercase">Group Members</h3>
            <button onClick={() => setShowMembers(false)}><X size={14} className="text-gray-500"/></button>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {activeChat.participants.map(p => (
              <div key={p._id} className="px-2 py-1.5 text-sm hover:bg-gray-100 rounded cursor-default">
                {p.name} {p._id === user._id ? '(You)' : ''}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{ backgroundImage: "url('https://static.whatsapp.net/rsrc.php/v3/yl/r/r2_N8S_M800.png')" }}></div>
      
      {/* Header */}
      <div className="h-16 bg-white px-4 flex items-center justify-between border-b border-gray-200 relative z-20 shadow-sm">
        <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer group" onClick={() => !activeChat.isGroup && setShowUserProfile(true)}>
          <button className="md:hidden p-2 -ml-2 rounded-full hover:bg-gray-100 flex-shrink-0" onClick={(e) => { e.stopPropagation(); setActiveChat(null) }}>
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold overflow-hidden flex-shrink-0 ${activeChat.isGroup ? 'bg-gray-500' : 'bg-primary'}`}>
            {activeChat.isGroup ? (
              <Users size={20} />
            ) : (
              other?.profilePic ? (
                <img src={other.profilePic.startsWith('http') ? other.profilePic : `http://localhost:4000${other.profilePic}`} alt={other.name} className="w-full h-full object-cover" />
              ) : (
                other?.name.charAt(0).toUpperCase()
              )
            )}
          </div>
          
          <div className="flex-1 min-w-0 group-hover:bg-gray-50 p-2 rounded transition-colors" onClick={() => activeChat.isGroup && setShowMembers(!showMembers)}>
            <h2 className="font-semibold text-gray-800 truncate">{displayName}</h2>
            <p className="text-xs text-secondary font-medium h-4 truncate">
              {getStatusText()}
            </p>
          </div>
        </div>
        
        <div className="flex gap-4 text-gray-600 relative">
          <button onClick={() => setShowMenu(!showMenu)} className="hover:bg-gray-100 p-2 rounded-full transition-colors">
            <MoreVertical size={20} />
          </button>
          {showMenu && (
            <div className="absolute top-full right-0 mt-1 bg-white shadow-lg border rounded-lg py-1 z-30 min-w-[150px]">
              {activeChat.isGroup ? (
                <button onClick={handleExitGroup} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center gap-2">
                  <LogOut size={16} /> Leave Group
                </button>
              ) : (
                <>
                  <button onClick={() => { setShowSearch(!showSearch); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                    <Search size={16} /> Search
                  </button>
                  <button onClick={handleBlockUser} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center gap-2">
                    <Ban size={16} /> {user.blockedUsers?.includes(other?._id) ? 'Unblock User' : 'Block User'}
                  </button>
                  <button onClick={handleClearChat} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center gap-2">
                    <LogOut size={16} /> Clear Chat
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="bg-white p-2 flex items-center gap-2 border-b z-30 shadow-sm absolute top-16 left-0 right-0">
          <Search size={18} className="text-gray-500" />
          <input 
            type="text" 
            placeholder="Search in chat..." 
            className="flex-1 bg-gray-100 rounded-full px-4 py-1 text-sm outline-none focus:ring-1 focus:ring-primary"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 scrollbar-custom relative z-10 space-y-2">
        {isLoadingMessages ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : displayedMessages.length === 0 ? (
          <div className="flex justify-center items-center h-full text-gray-500 text-sm">
            {searchQuery ? 'No messages found.' : 'Say hi!'}
          </div>
        ) : (
          displayedMessages.map((msg, index) => {
            const showDate = index === 0 || format(new Date(msg.timestamp), 'yyyy-MM-dd') !== format(new Date(displayedMessages[index - 1].timestamp), 'yyyy-MM-dd')
            const isMe = msg.senderId === user._id
            
            // For group chat, find sender name
            const senderName = isMe ? 'You' : (activeChat.participants.find(p => p._id === msg.senderId)?.name || 'Unknown')

            return (
              <div key={msg._id || index}>
                {showDate && renderDateSeparator(new Date(msg.timestamp))}
                
                <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1`}>
                  <div 
                    className={`relative max-w-[85%] sm:max-w-[70%] px-3 py-2 rounded-lg shadow-sm ${
                      isMe 
                        ? 'bg-message-out rounded-tr-none text-gray-800' 
                        : 'bg-message-in rounded-tl-none text-gray-800'
                    }`}
                  >
                    {activeChat.isGroup && !isMe && (
                      <div className="text-xs font-semibold text-orange-500 mb-1">{senderName}</div>
                    )}
                    
                    {renderFile(msg)}
                    
                    {msg.content.text && <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content.text}</p>}
                    
                    <div className="flex items-center justify-end gap-1 mt-1 -mb-1">
                      <span className="text-[10px] text-gray-500 whitespace-nowrap">
                        {formatMessageTime(msg.timestamp)}
                      </span>
                      {renderStatus(msg)}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-gray-100 px-4 py-3 flex items-center gap-2 z-10 border-t border-gray-200">
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={handleFileUpload}
          accept="image/*,application/pdf,audio/*,video/*"
        />
        <button 
          onClick={() => fileInputRef.current.click()} 
          className={`p-2 text-gray-500 hover:text-gray-700 transition-colors ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={isUploading || isRecording}
        >
          {isUploading ? <div className="animate-spin h-5 w-5 border-2 border-gray-500 border-t-transparent rounded-full" /> : <Paperclip size={24} />}
        </button>
        
        {isRecording ? (
          <div className="flex-1 flex items-center bg-red-50 rounded-lg px-4 py-2.5 animate-pulse">
            <div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>
            <span className="text-red-500 text-sm font-medium">Recording... {recordingTime}s</span>
          </div>
        ) : (
          <form onSubmit={handleSend} className="flex-1 flex gap-2">
            <input
              type="text"
              className="flex-1 bg-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary shadow-sm text-sm"
              placeholder="Type a message"
              value={text}
              onChange={handleTyping}
              disabled={isUploading}
            />
          </form>
        )}
        
        {text.trim() ? (
          <button 
            onClick={handleSend}
            disabled={isUploading}
            className="p-2.5 rounded-full flex items-center justify-center transition-all bg-primary text-white hover:bg-primary-dark shadow-md"
          >
            <Send size={20} className="ml-0.5" />
          </button>
        ) : (
          <button 
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isUploading}
            className={`p-2.5 rounded-full flex items-center justify-center transition-all shadow-md ${isRecording ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-primary text-white hover:bg-primary-dark'}`}
          >
            {isRecording ? <Square size={20} /> : <Mic size={20} />}
          </button>
        )}
      </div>
    </div>
  )
}

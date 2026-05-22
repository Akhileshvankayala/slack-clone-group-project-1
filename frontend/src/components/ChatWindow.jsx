import { useState, useEffect, useRef } from 'react'
import { useChatStore } from '../stores/chatStore'
import { useAuthStore } from '../stores/authStore'
import { ArrowLeft, Send, MoreVertical, Paperclip, Check, CheckCheck, Mic, Square, Users, FileText, Image as ImageIcon, Search, X, LogOut, Ban, Trash2, Edit3, Hash, ChevronDown, Plus } from 'lucide-react'
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns'
import { api } from '../stores/authStore'
import { useSocketStore } from '../stores/socketStore'
import { toast } from 'react-hot-toast'
import UserProfile from './UserProfile'
import { getProfilePicUrl, getFileUrl } from '../config'

export default function ChatWindow() {
  const { user } = useAuthStore()
  const { activeChat, setActiveChat, messages, sendMessage, uploadFile, isLoadingMessages, typingUsers, setTyping, updateMessage, addParticipants, removeParticipant } = useChatStore()
  
  const [text, setText] = useState('')
  const [editMessageId, setEditMessageId] = useState(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  
  const [showMenu, setShowMenu] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showMembers, setShowMembers] = useState(false)
  const [enlargedMedia, setEnlargedMedia] = useState(null)
  const [showUserProfile, setShowUserProfile] = useState(false)
  const [selectedUserProfile, setSelectedUserProfile] = useState(null)
  const [showAddMembers, setShowAddMembers] = useState(false)
  const [memberSearch, setMemberSearch] = useState('')
  const [memberSearchResults, setMemberSearchResults] = useState([])
  
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
    if (activeChat?.chatId) {
      const { socket } = useSocketStore.getState()
      if (socket) {
        socket.emit('message:read', { chatId: activeChat.chatId })
      }
    }
  }, [activeChat?.chatId, messages.length])

  useEffect(() => {
    const handleReadUpdate = ({ chatId, messageIds, status }) => {
      if (activeChat?.chatId === chatId) {
        useChatStore.getState().updateMessagesStatus(messageIds, status)
      }
    }

    const { socket } = useSocketStore.getState()
    if (socket) {
      socket.on('message:read:update', handleReadUpdate)
    }

    return () => {
      if (socket) {
        socket.off('message:read:update', handleReadUpdate)
      }
      if (timerRef.current) clearInterval(timerRef.current)
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
    }
  }, [activeChat?.chatId])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!text.trim()) return

    if (editMessageId) {
      try {
        const res = await api.patch(`/chats/${activeChat.chatId}/messages/${editMessageId}`, { text: text.trim() })
        updateMessage(res.data.message)
        setEditMessageId(null)
        setText('')
        toast.success('Message updated successfully')
        useChatStore.getState().fetchChats()
      } catch (err) {
        console.error('Edit message failed', err)
        toast.error('Could not update the message. Please try again.')
      }
      return
    }

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
    e.target.value = '' 
  }

  const handleEditMessage = (message) => {
    setEditMessageId(message._id)
    setText(message.content?.text || '')
  }

  const handleCancelEdit = () => {
    setEditMessageId(null)
    setText('')
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
      toast.error("Could not access microphone.")
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

  useEffect(() => {
    if (!memberSearch.trim()) {
      setMemberSearchResults([])
      return
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/users?search=${memberSearch}`)
        const existingIds = activeChat.participants.map(p => p._id)
        setMemberSearchResults(res.data.users.filter(u => !existingIds.includes(u._id)))
      } catch (err) {
        console.error(err)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [memberSearch, activeChat?.participants])

  const handleAddMember = async (userId) => {
    try {
      const result = await addParticipants(activeChat.chatId, [userId])
      if (result.success) {
        toast.success('Member added successfully')
        setMemberSearch('')
        setShowAddMembers(false)
      } else {
        toast.error(result.message || 'Failed to add member')
      }
    } catch (err) {
      console.error(err)
      toast.error('An error occurred')
    }
  }

  const handleRemoveMember = async (participantId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return
    try {
      const result = await removeParticipant(activeChat.chatId, participantId)
      if (result.success) {
        toast.success('Member removed successfully')
      } else {
        toast.error(result.message || 'Failed to remove member')
      }
    } catch (err) {
      console.error(err)
      toast.error('An error occurred')
    }
  }

  const handleExitGroup = async () => {
    if(window.confirm("Are you sure you want to leave this channel?")) {
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

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Delete this message? This action cannot be undone.')) return

    try {
      await api.delete(`/chats/${activeChat.chatId}/messages/${messageId}`)
      useChatStore.getState().removeMessage(messageId)
      useChatStore.getState().fetchChats()
      toast.success('Message deleted successfully')
    } catch (err) {
      console.error('Delete message failed', err)
      toast.error('Could not delete the message. Please try again.')
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
    if (activeChat.isGroup) return `${activeChat.participants.length} members`
    if (other?.isOnline) return 'online'
    if (other?.lastSeen) return `active ${formatDistanceToNow(new Date(other.lastSeen), { addSuffix: true })}`
    return 'offline'
  }

  const formatMessageTime = (dateStr) => {
    return format(new Date(dateStr), 'HH:mm')
  }

  const renderDateSeparator = (date) => {
    let dateText = format(date, 'dd MMMM yyyy')
    if (isToday(date)) dateText = 'Today'
    else if (isYesterday(date)) dateText = 'Yesterday'

    return (
      <div className="flex items-center my-5 px-6 select-none">
        <div className="flex-1 border-t border-gray-200"></div>
        <span className="mx-4 text-[10px] font-bold text-gray-500 bg-white px-2.5 py-0.5 rounded border border-gray-200 uppercase tracking-wider shadow-2xs">
          {dateText}
        </span>
        <div className="flex-1 border-t border-gray-200"></div>
      </div>
    )
  }

  const renderStatus = (msg) => {
    if (msg.senderId !== user._id) return null
    if (msg.status === 'sent') return <Check size={12} className="text-gray-400" />
    if (msg.status === 'delivered') return <CheckCheck size={12} className="text-gray-400" />
    if (msg.status === 'read') return <CheckCheck size={12} className="text-blue-500" />
    return null
  }

  const renderFile = (msg) => {
    if (!msg.content.fileUrl) return null
    const { fileUrl, fileType } = msg.content
    const resolvedUrl = getFileUrl(fileUrl)
    
    if (fileType === 'image') {
      return (
        <div className="my-1.5 max-w-sm rounded-lg overflow-hidden border border-gray-200 bg-gray-50 shadow-2xs">
          <img onClick={() => setEnlargedMedia({ url: resolvedUrl, type: 'image' })} src={resolvedUrl} alt="attachment" className="max-h-60 object-cover cursor-pointer hover:opacity-95 transition" />
        </div>
      )
    } else if (fileType === 'audio') {
      return (
        <div className="my-1.5 max-w-xs p-2 rounded bg-gray-50 border border-gray-200">
          <audio controls src={resolvedUrl} className="w-full text-xs" />
        </div>
      )
    } else if (fileType === 'pdf') {
      return (
        <div onClick={() => setEnlargedMedia({ url: resolvedUrl, type: 'pdf' })} className="my-1.5 flex items-center gap-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 p-2.5 rounded-lg max-w-xs transition cursor-pointer shadow-2xs">
          <FileText size={20} className="text-red-500 shrink-0" />
          <span className="text-xs font-semibold text-blue-600 truncate underline flex-1">View PDF attachment</span>
        </div>
      )
    } else {
      return (
        <a href={resolvedUrl} target="_blank" rel="noopener noreferrer" className="my-1.5 flex items-center gap-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 p-2.5 rounded-lg max-w-xs transition shadow-2xs">
          <FileText size={20} className="text-red-500 shrink-0" />
          <span className="text-xs font-semibold text-blue-600 truncate underline flex-1">View Document</span>
        </a>
      )
    }
  }

  if (!activeChat) return null

  const displayName = activeChat.isGroup ? activeChat.groupName : other?.name
  const displayedMessages = searchQuery 
    ? messages.filter(m => m.content?.text?.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages

  return (
    <div className="flex flex-col h-full bg-white relative">
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
      {showUserProfile && (selectedUserProfile || other) && (
        <div className="absolute inset-0 bg-white z-60 flex flex-col h-full text-gray-900">
          <UserProfile 
            user={selectedUserProfile || other} 
            onClose={() => {
              setShowUserProfile(false)
              setSelectedUserProfile(null)
            }} 
          />
        </div>
      )}

      {/* Members Modal */}
      {showMembers && activeChat.isGroup && (
        <div className="absolute top-16 left-6 bg-white shadow-xl border border-gray-200 rounded-lg p-3.5 z-30 min-w-[220px]">
          <div className="flex justify-between items-center mb-2.5 pb-1.5 border-b border-gray-100">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Channel Members</h3>
            <button onClick={() => setShowMembers(false)} className="hover:bg-gray-100 p-0.5 rounded"><X size={14} className="text-gray-500"/></button>
          </div>
          <div className="max-h-60 overflow-y-auto space-y-1.5">
            {activeChat.participants.map(p => (
              <div key={p._id} className="px-2 py-1 text-xs hover:bg-gray-50 rounded flex items-center justify-between group/member text-gray-800">
                <span 
                  onClick={() => {
                    if (p._id !== user._id) {
                      setSelectedUserProfile(p)
                      setShowUserProfile(true)
                      setShowMembers(false)
                    }
                  }}
                  className={`truncate pr-2 font-medium ${p._id !== user._id ? 'hover:underline cursor-pointer' : ''}`}
                >
                  {p.name} {p._id === user._id ? '(You)' : ''}
                  {p._id === activeChat.admin && <span className="ml-1 text-[9px] bg-emerald-55 text-emerald-700 px-1 rounded font-bold border border-emerald-200">ADMIN</span>}
                </span>
                {activeChat.admin === user._id && p._id !== user._id && (
                  <button 
                    onClick={() => handleRemoveMember(p._id)} 
                    className="text-red-500 hover:text-red-700 opacity-0 group-hover/member:opacity-100 transition-opacity"
                    title="Remove member"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {activeChat.admin === user._id && (
            <div className="mt-3 pt-2.5 border-t border-gray-100">
              {showAddMembers ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Search users..."
                    className="w-full text-xs border border-gray-300 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-slack-active focus:border-slack-active"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    autoFocus
                  />
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {memberSearchResults.map(u => (
                      <div key={u._id} onClick={() => handleAddMember(u._id)} className="px-2 py-1 text-xs hover:bg-gray-100 cursor-pointer rounded flex items-center gap-2">
                        <div className="w-5 h-5 rounded-md bg-slack-active flex items-center justify-center text-[10px] text-white shrink-0 font-bold">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="truncate text-gray-700 font-medium">{u.name}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setShowAddMembers(false)} className="text-[10px] text-gray-500 hover:underline w-full text-center">Cancel</button>
                </div>
              ) : (
                <button 
                  onClick={() => setShowAddMembers(true)} 
                  className="w-full text-xs py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1 font-semibold"
                >
                  Add Member
                </button>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Header */}
      <div className="h-14 bg-white px-6 flex items-center justify-between border-b border-gray-200 relative z-20 shadow-xs">
        <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer group" onClick={() => !activeChat.isGroup && setShowUserProfile(true)}>
          <button className="md:hidden p-1.5 -ml-1 rounded-full hover:bg-gray-100 flex-shrink-0" onClick={(e) => { e.stopPropagation(); setActiveChat(null) }}>
            <ArrowLeft size={16} className="text-gray-600" />
          </button>
          
          <div className="flex flex-col min-w-0" onClick={() => activeChat.isGroup && setShowMembers(!showMembers)}>
            <h2 className="font-bold text-gray-800 text-sm flex items-center gap-1.5 truncate">
              {activeChat.isGroup ? (
                <>
                  <Hash size={15} className="text-gray-500 flex-shrink-0" />
                  {displayName}
                </>
              ) : (
                <>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${other?.isOnline ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                  {displayName}
                </>
              )}
              <ChevronDown size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h2>
            <p className="text-[10px] text-gray-500 font-medium h-4 truncate">
              {getStatusText()}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2 text-gray-500 relative">
          <button onClick={() => setShowSearch(!showSearch)} className="hover:bg-gray-100 p-1.5 rounded-md transition-colors" title="Search messages">
            <Search size={16} />
          </button>
          <button onClick={() => setShowMenu(!showMenu)} className="hover:bg-gray-100 p-1.5 rounded-md transition-colors">
            <MoreVertical size={16} />
          </button>
          {showMenu && (
            <div className="absolute top-full right-0 mt-1 bg-white shadow-lg border border-gray-200 rounded-lg py-1 z-35 min-w-[160px] text-gray-700">
              {activeChat.isGroup ? (
                <button onClick={handleExitGroup} className="w-full text-left px-4 py-2 text-xs text-red-650 hover:bg-gray-100 flex items-center gap-2 font-medium">
                  <LogOut size={14} /> Leave Channel
                </button>
              ) : (
                <>
                  <button onClick={handleBlockUser} className="w-full text-left px-4 py-2 text-xs text-red-655 hover:bg-gray-100 flex items-center gap-2 font-medium">
                    <Ban size={14} /> {user.blockedUsers?.includes(other?._id) ? 'Unblock User' : 'Block User'}
                  </button>
                  <button onClick={handleClearChat} className="w-full text-left px-4 py-2 text-xs text-red-655 hover:bg-gray-100 flex items-center gap-2 font-medium">
                    <Trash2 size={14} /> Clear Chat
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="bg-white p-2 flex items-center gap-2 border-b border-gray-250 z-30 shadow-xs absolute top-14 left-0 right-0">
          <Search size={16} className="text-gray-500 ml-2" />
          <input 
            type="text" 
            placeholder="Search in chat..." 
            className="flex-1 bg-gray-100 rounded px-4 py-1 text-xs outline-none focus:ring-1 focus:ring-slack-active"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} className="p-1 hover:bg-gray-200 rounded-full transition-colors mr-2">
            <X size={15} className="text-gray-500" />
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 scrollbar-custom bg-white space-y-1">
        {isLoadingMessages ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slack-active"></div>
          </div>
        ) : displayedMessages.length === 0 ? (
          <div className="flex justify-center items-center h-full text-gray-400 text-xs italic">
            {searchQuery ? 'No messages found.' : 'Say hi! This conversation is starting.'}
          </div>
        ) : (
          displayedMessages.map((msg, index) => {
            const showDate = index === 0 || format(new Date(msg.timestamp), 'yyyy-MM-dd') !== format(new Date(displayedMessages[index - 1].timestamp), 'yyyy-MM-dd')
            const isOwn = msg.senderId === user._id
            
            const timeDiff = index > 0 ? (new Date(msg.timestamp) - new Date(displayedMessages[index - 1].timestamp)) : 0
            const isConsecutive = !showDate && index > 0 && displayedMessages[index - 1].senderId === msg.senderId && timeDiff < 120000;

            const otherSender = activeChat.participants.find(p => p._id === msg.senderId)
            const senderName = isOwn ? 'You' : (otherSender?.name || 'Unknown')

            return (
              <div key={msg._id || index}>
                {showDate && renderDateSeparator(new Date(msg.timestamp))}
                
                <div className="flex items-start px-6 py-1 hover:bg-slack-hover-bg group relative select-text transition-colors">
                  {/* Floating Context Toolbar */}
                  {isOwn && (
                    <div className="absolute right-6 top-1.5 flex bg-white border border-gray-200 shadow-sm rounded-md px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-20 gap-0.5">
                      {msg.content?.text && (
                        <button
                          onClick={() => handleEditMessage(msg)}
                          className="text-gray-650 hover:text-blue-500 hover:bg-gray-100 p-1 rounded"
                          title="Edit message"
                        >
                          <Edit3 size={13} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteMessage(msg._id)}
                        className="text-gray-650 hover:text-red-500 hover:bg-gray-100 p-1 rounded"
                        title="Delete message"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}

                  {isConsecutive ? (
                    /* Left hover time margin */
                    <div className="w-9 flex-shrink-0 text-right pr-3 select-none text-[9px] text-gray-400 opacity-0 group-hover:opacity-100 pt-1">
                      {formatMessageTime(msg.timestamp)}
                    </div>
                  ) : (
                    /* Left User Avatar */
                    <div className="w-9 h-9 rounded bg-slack-purple-dark text-white font-bold text-sm mr-3 flex-shrink-0 overflow-hidden flex items-center justify-center border border-white/10 shadow-sm select-none">
                      {isOwn ? (
                        user.profilePic ? (
                          <img src={getProfilePicUrl(user.profilePic)} className="w-full h-full object-cover" />
                        ) : (
                          user.name.charAt(0).toUpperCase()
                        )
                      ) : (
                        otherSender?.profilePic ? (
                          <img src={getProfilePicUrl(otherSender.profilePic)} className="w-full h-full object-cover" />
                        ) : (
                          senderName.charAt(0).toUpperCase()
                        )
                      )}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    {!isConsecutive && (
                      /* Header Row */
                      <div className="flex items-baseline mb-0.5">
                        <span 
                          onClick={() => {
                            if (!isOwn && otherSender) {
                              setSelectedUserProfile(otherSender);
                              setShowUserProfile(true);
                            }
                          }}
                          className="font-bold text-gray-900 text-xs hover:underline cursor-pointer"
                        >
                          {senderName}
                        </span>
                        <span className="text-[9px] text-gray-500 ml-2 select-none">
                          {formatMessageTime(msg.timestamp)}
                        </span>
                        {msg.edited && <span className="text-[9px] text-gray-400 italic ml-1.5 select-none">(edited)</span>}
                        {isOwn && <span className="ml-2 flex items-center select-none">{renderStatus(msg)}</span>}
                      </div>
                    )}
                    
                    {isConsecutive && msg.edited && (
                      <span className="text-[9px] text-gray-400 italic float-right mt-1 select-none">(edited)</span>
                    )}

                    {/* File attachments */}
                    {renderFile(msg)}
                    
                    {/* Message content */}
                    {msg.content.text && (
                      <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap break-words">
                        {msg.content.text}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 🔹 Inset Text Editor Input Box */}
      <div className="px-6 pb-6 bg-white">
        {isRecording ? (
          <div className="flex items-center bg-red-50 rounded-lg px-4 py-2.5 animate-pulse mb-3 border border-red-200">
            <div className="w-2 h-2 rounded-full bg-red-550 mr-2"></div>
            <span className="text-red-550 text-xs font-semibold flex-1">Recording Voice Note... {recordingTime}s</span>
            <button onClick={stopRecording} className="text-red-550 hover:text-red-700 font-bold text-xs uppercase underline">Stop</button>
          </div>
        ) : (
          editMessageId && (
            <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-xs text-amber-800 mb-3 shadow-2xs">
              <span>Editing message</span>
              <button type="button" onClick={handleCancelEdit} className="underline text-amber-850 hover:text-amber-900 font-semibold">
                Cancel
              </button>
            </div>
          )
        )}
        
        <div className="border border-gray-300 rounded-lg bg-white overflow-hidden flex flex-col focus-within:border-gray-400 focus-within:ring-1 focus-within:ring-gray-300">
          {/* Form input field */}
          <form onSubmit={handleSend} className="w-full">
            <input
              type="text"
              className="w-full px-4 py-3 focus:outline-none text-sm text-gray-800 placeholder-gray-400 bg-transparent"
              placeholder={editMessageId ? 'Edit message' : activeChat.isGroup ? `Message #${displayName}` : `Message ${displayName}`}
              value={text}
              onChange={handleTyping}
              disabled={isUploading}
            />
          </form>
          
          {/* Rich text mock tools & functional send row */}
          <div className="bg-gray-50 border-t border-gray-200 px-3 py-1.5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-500">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileUpload}
                accept="image/*,application/pdf,audio/*,video/*"
              />
              <button 
                onClick={() => fileInputRef.current.click()} 
                className={`p-1.5 hover:bg-gray-200 rounded text-gray-600 transition-colors ${isUploading ? 'opacity-55 cursor-not-allowed' : ''}`}
                disabled={isUploading || isRecording}
                title="Attach file"
              >
                {isUploading ? <div className="animate-spin h-4 w-4 border-2 border-gray-500 border-t-transparent rounded-full" /> : <Paperclip size={15} />}
              </button>
              
              <span className="w-[1px] h-4 bg-gray-300 mx-1 select-none"></span>
              {/* Mock formatting items for premium Slack look */}
              <button className="p-1 hover:bg-gray-200 rounded font-bold text-xs select-none" title="Bold (Mock)">B</button>
              <button className="p-1 hover:bg-gray-200 rounded italic text-xs select-none" title="Italic (Mock)">I</button>
              <button className="p-1 hover:bg-gray-200 rounded line-through text-xs select-none" title="Strikethrough (Mock)">S</button>
              <button className="p-1.5 hover:bg-gray-200 rounded text-gray-500 select-none" title="Code Block (Mock)">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M16 18l6-6-6-6M8 6L2 12l6 6" /></svg>
              </button>
            </div>

            {/* Mic/Send button on the right */}
            <div className="flex items-center gap-2 select-none">
              {text.trim() ? (
                <button 
                  onClick={handleSend}
                  disabled={isUploading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded p-1.5 transition-all shadow-xs flex items-center justify-center"
                  title="Send message"
                >
                  <Send size={13} />
                </button>
              ) : (
                <button 
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isUploading}
                  className={`rounded p-1.5 transition-all shadow-xs flex items-center justify-center ${isRecording ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-200 hover:bg-gray-300 text-gray-650'}`}
                  title={isRecording ? 'Stop Recording' : 'Record Audio'}
                >
                  {isRecording ? <Square size={13} /> : <Mic size={13} />}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

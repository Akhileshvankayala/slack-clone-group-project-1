import { useState, useEffect, useRef } from 'react'
import { useChatStore } from '../stores/chatStore'
import { useAuthStore } from '../stores/authStore'
import { Send, MoreVertical, Paperclip, Check, CheckCheck, X, FileText, Image as ImageIcon, Trash2, Edit3, Users, Mic, Square, Hash, ChevronDown } from 'lucide-react'
import { format, isToday, isYesterday } from 'date-fns'
import { api } from '../stores/authStore'
import { useSocketStore } from '../stores/socketStore'
import { toast } from 'react-hot-toast'
import { getProfilePicUrl, getFileUrl } from '../config'

export default function ChatPanel({ panelId, chat, messages, onClose }) {
  const { user } = useAuthStore()
  const { sendMessage, uploadFile, closeChatPanel, removeMessage, updateMessage } = useChatStore()
  
  const [text, setText] = useState('')
  const [editMessageId, setEditMessageId] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [enlargedMedia, setEnlargedMedia] = useState(null)
  
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const timerRef = useRef(null)

  const other = !chat?.isGroup ? (chat?.participants.find(p => p._id !== user._id) || chat?.participants[0]) : null

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (chat?.chatId) {
      const { socket } = useSocketStore.getState()
      if (socket) {
        socket.emit('message:read', { chatId: chat.chatId })
      }
    }
  }, [chat?.chatId, messages.length])

  useEffect(() => {
    const handleReadUpdate = ({ chatId: receivedChatId, messageIds, status }) => {
      if (chat?.chatId === receivedChatId) {
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
  }, [chat?.chatId])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!text.trim()) return

    if (editMessageId) {
      try {
        const res = await api.patch(`/chats/${chat.chatId}/messages/${editMessageId}`, { text: text.trim() })
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

    sendMessage(chat.chatId, text.trim())
    setText('')
    
    const { socket } = useSocketStore.getState()
    if (socket) {
      socket.emit('user:stopTyping', { chatId: chat.chatId })
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setIsUploading(true)
    const result = await uploadFile(file)
    setIsUploading(false)
    if (result) {
      sendMessage(chat.chatId, '', result.fileUrl, result.fileType)
    }
    e.target.value = ''
  }

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Delete this message?')) return

    try {
      await api.delete(`/chats/${chat.chatId}/messages/${messageId}`)
      removeMessage(messageId)
      toast.success('Message deleted successfully')
    } catch (err) {
      console.error('Failed to delete message:', err)
      toast.error('Could not delete the message. Please try again.')
    }
  }

  const handleEditMessage = (message) => {
    setEditMessageId(message._id)
    setText(message.content?.text || '')
  }

  const handleCancelEdit = () => {
    setEditMessageId(null)
    setText('')
  }

  const handleTyping = (e) => {
    setText(e.target.value)
    
    const { socket } = useSocketStore.getState()
    if (!socket) return

    socket.emit('user:typing', { chatId: chat.chatId })

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('user:stopTyping', { chatId: chat.chatId })
    }, 2000)
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
          sendMessage(chat.chatId, '', result.fileUrl, 'audio')
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

  const handleClose = () => {
    closeChatPanel(panelId)
    onClose?.()
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
        <div className="my-1 max-w-xs rounded overflow-hidden border border-gray-200 bg-gray-50 shadow-2xs">
          <img onClick={() => setEnlargedMedia(resolvedUrl)} src={resolvedUrl} alt="attachment" className="max-h-48 object-cover cursor-pointer hover:opacity-95 transition" />
        </div>
      )
    } else if (fileType === 'audio') {
      return (
        <div className="my-1 max-w-xs p-1.5 rounded bg-gray-50 border border-gray-200">
          <audio controls src={resolvedUrl} className="w-full text-[10px]" />
        </div>
      )
    } else {
      return (
        <a href={resolvedUrl} target="_blank" rel="noopener noreferrer" className="my-1 flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 p-2 rounded max-w-xs transition shadow-2xs">
          <FileText size={16} className="text-red-500 flex-shrink-0" />
          <span className="text-[11px] font-semibold text-blue-600 truncate underline flex-1">View attachment</span>
        </a>
      )
    }
  }

  const formatMessageTime = (dateStr) => {
    return format(new Date(dateStr), 'HH:mm')
  }

  const renderDateSeparator = (date) => {
    let dateText = format(date, 'dd MMMM yyyy')
    if (isToday(date)) dateText = 'Today'
    else if (isYesterday(date)) dateText = 'Yesterday'

    return (
      <div className="flex items-center my-4 px-4 select-none">
        <div className="flex-1 border-t border-gray-200"></div>
        <span className="mx-2 text-[9px] font-bold text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200 uppercase tracking-wider shadow-2xs">
          {dateText}
        </span>
        <div className="flex-1 border-t border-gray-200"></div>
      </div>
    )
  }

  if (!chat) return null

  const displayName = chat.isGroup ? chat.groupName : other?.name || 'Chat'

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      {/* Header */}
      <div className="h-14 bg-white p-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex flex-col min-w-0">
            <h2 className="font-bold text-gray-800 text-xs flex items-center gap-1 truncate">
              {chat.isGroup ? (
                <>
                  <Hash size={14} className="text-gray-500 flex-shrink-0" />
                  {displayName}
                </>
              ) : (
                <>
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${other?.isOnline ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                  {displayName}
                </>
              )}
            </h2>
            <p className="text-[9px] text-gray-400">
              {chat.isGroup ? `${chat.participants.length} members` : other?.isOnline ? 'online' : 'offline'}
            </p>
          </div>
        </div>
        
        <button
          onClick={handleClose}
          className="p-1.5 hover:bg-gray-100 rounded-md transition-colors flex-shrink-0"
          title="Close panel"
        >
          <X size={16} className="text-gray-650" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-3 bg-white space-y-0.5">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-xs italic">
            <p>No messages yet.</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const showDate = index === 0 || format(new Date(msg.timestamp), 'yyyy-MM-dd') !== format(new Date(messages[index - 1].timestamp), 'yyyy-MM-dd')
            const isOwn = msg.senderId === user._id
            
            const timeDiff = index > 0 ? (new Date(msg.timestamp) - new Date(messages[index - 1].timestamp)) : 0
            const isConsecutive = !showDate && index > 0 && messages[index - 1].senderId === msg.senderId && timeDiff < 120000;

            const otherSender = chat.participants.find(p => p._id === msg.senderId)
            const senderName = isOwn ? 'You' : (otherSender?.name || 'Unknown')

            return (
              <div key={msg._id || index}>
                {showDate && renderDateSeparator(new Date(msg.timestamp))}
                
                <div className="flex items-start px-4 py-0.5 hover:bg-slack-hover-bg group relative select-text transition-colors">
                  {/* Floating Context Toolbar */}
                  {isOwn && (
                    <div className="absolute right-4 top-1 flex bg-white border border-gray-200 shadow-sm rounded px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-20 gap-0.5">
                      {msg.content?.text && (
                        <button
                          onClick={() => handleEditMessage(msg)}
                          className="text-gray-600 hover:text-blue-500 hover:bg-gray-150 p-0.5 rounded"
                          title="Edit message"
                        >
                          <Edit3 size={11} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteMessage(msg._id)}
                        className="text-gray-650 hover:text-red-500 hover:bg-gray-150 p-0.5 rounded"
                        title="Delete message"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  )}

                  {isConsecutive ? (
                    <div className="w-7 flex-shrink-0 text-right pr-2 select-none text-[8px] text-gray-400 opacity-0 group-hover:opacity-100 pt-0.5">
                      {formatMessageTime(msg.timestamp)}
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded bg-slack-purple-dark text-white font-bold text-xs mr-2 flex-shrink-0 overflow-hidden flex items-center justify-center border border-white/10 shadow-sm select-none">
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
                      <div className="flex items-baseline mb-0.5">
                        <span className="font-bold text-gray-900 text-[11px] hover:underline cursor-pointer">
                          {senderName}
                        </span>
                        <span className="text-[8px] text-gray-400 ml-1.5 select-none">
                          {formatMessageTime(msg.timestamp)}
                        </span>
                        {msg.edited && <span className="text-[8px] text-gray-400 italic ml-1 select-none">(edited)</span>}
                        {isOwn && <span className="ml-1.5 flex items-center select-none">{renderStatus(msg)}</span>}
                      </div>
                    )}
                    
                    {isConsecutive && msg.edited && (
                      <span className="text-[8px] text-gray-400 italic float-right mt-0.5 select-none">(edited)</span>
                    )}

                    {renderFile(msg)}
                    
                    {msg.content.text && (
                      <p className="text-xs text-gray-800 leading-relaxed whitespace-pre-wrap break-words">
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

      {/* Input */}
      <div className="px-4 pb-4 bg-white">
        {isRecording ? (
          <div className="flex items-center bg-red-50 rounded px-3 py-1.5 animate-pulse mb-2 border border-red-200">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 mr-2"></div>
            <span className="text-red-500 text-[10px] font-semibold flex-1">Recording... {recordingTime}s</span>
            <button onClick={stopRecording} className="text-red-500 hover:text-red-750 font-bold text-[9px] uppercase underline">Stop</button>
          </div>
        ) : (
          editMessageId && (
            <div className="flex items-center justify-between bg-amber-50 border border-amber-250 rounded px-3 py-1 text-[10px] text-amber-800 mb-2">
              <span>Editing message</span>
              <button type="button" onClick={handleCancelEdit} className="underline text-amber-800 hover:text-amber-900 font-semibold">
                Cancel
              </button>
            </div>
          )
        )}
        
        <div className="border border-gray-300 rounded-md bg-white overflow-hidden flex flex-col focus-within:border-gray-450 focus-within:ring-1 focus-within:ring-gray-300">
          <form onSubmit={handleSend} className="w-full">
            <input
              type="text"
              className="w-full px-3 py-2 focus:outline-none text-xs text-gray-800 placeholder-gray-400 bg-transparent"
              placeholder={editMessageId ? 'Edit message' : `Message...`}
              value={text}
              onChange={handleTyping}
              disabled={isUploading}
            />
          </form>
          
          <div className="bg-gray-50 border-t border-gray-200 px-2 py-1 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-gray-500">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileUpload}
                accept="image/*,application/pdf,audio/*,video/*"
              />
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="p-1 hover:bg-gray-200 rounded text-gray-600 disabled:opacity-50"
                disabled={isUploading || isRecording}
              >
                {isUploading ? <div className="animate-spin h-3.5 w-3.5 border-2 border-gray-500 border-t-transparent rounded-full" /> : <Paperclip size={13} />}
              </button>
            </div>

            <div className="flex items-center gap-1 select-none">
              {text.trim() ? (
                <button 
                  onClick={handleSend}
                  disabled={isUploading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded p-1 transition-all shadow-xs flex items-center justify-center"
                >
                  <Send size={11} />
                </button>
              ) : (
                <button 
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isUploading}
                  className={`rounded p-1 transition-all shadow-xs flex items-center justify-center ${isRecording ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-200 hover:bg-gray-300 text-gray-650'}`}
                >
                  {isRecording ? <Square size={11} /> : <Mic size={11} />}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Enlarged Media Modal */}
      {enlargedMedia && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={() => setEnlargedMedia(null)}
        >
          <div className="relative max-w-4xl max-h-screen" onClick={e => e.stopPropagation()}>
            <img src={enlargedMedia} alt="enlarged" className="w-full h-auto" />
            <button
              onClick={() => setEnlargedMedia(null)}
              className="absolute top-4 right-4 bg-white rounded-full p-2 hover:bg-gray-100"
            >
              <X size={24} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

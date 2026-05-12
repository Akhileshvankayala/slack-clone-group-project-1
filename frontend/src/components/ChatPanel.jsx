import { useState, useEffect, useRef } from 'react'
import { useChatStore } from '../stores/chatStore'
import { useAuthStore } from '../stores/authStore'
import { Send, MoreVertical, Paperclip, Check, CheckCheck, X, FileText, Image as ImageIcon } from 'lucide-react'
import { format, isToday, isYesterday } from 'date-fns'
import { api } from '../stores/authStore'
import { useSocketStore } from '../stores/socketStore'

export default function ChatPanel({ panelId, chat, messages, onClose }) {
  const { user } = useAuthStore()
  const { sendMessage, uploadFile, closeChatPanel } = useChatStore()
  
  const [text, setText] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [enlargedMedia, setEnlargedMedia] = useState(null)
  
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  const other = !chat?.isGroup ? (chat?.participants.find(p => p._id !== user._id) || chat?.participants[0]) : null

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = (e) => {
    e.preventDefault()
    if (!text.trim()) return
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

  const handleClose = () => {
    closeChatPanel(panelId)
    onClose?.()
  }

  const getMediaPreview = (message) => {
    if (message.content?.fileType === 'image') {
      return (
        <img
          src={message.content?.fileUrl}
          alt="image"
          className="max-w-xs rounded-lg cursor-pointer hover:opacity-90"
          onClick={() => setEnlargedMedia(message.content?.fileUrl)}
        />
      )
    }
    if (message.content?.fileType === 'audio') {
      return (
        <audio controls className="max-w-xs">
          <source src={message.content?.fileUrl} type="audio/webm" />
        </audio>
      )
    }
    if (message.content?.fileType === 'file') {
      return (
        <a
          href={message.content?.fileUrl}
          download
          className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90"
        >
          <FileText size={16} />
          Download file
        </a>
      )
    }
    return null
  }

  const getMessageTime = (date) => {
    const msgDate = new Date(date)
    if (isToday(msgDate)) return format(msgDate, 'HH:mm')
    if (isYesterday(msgDate)) return 'Yesterday'
    return format(msgDate, 'dd/MM/yy')
  }

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      {/* Header */}
      <div className="bg-gray-50 p-3 border-b border-gray-200 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold overflow-hidden flex-shrink-0 ${chat?.isGroup ? 'bg-gray-500' : 'bg-primary'}`}>
          {chat?.isGroup ? (
            <Users size={20} />
          ) : (
            other?.profilePic ? (
              <img src={other.profilePic.startsWith('http') ? other.profilePic : `http://localhost:4000${other.profilePic}`} alt={other.name} className="w-full h-full object-cover" />
            ) : (
              other?.name?.charAt(0).toUpperCase() || '?'
            )
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-gray-800 truncate leading-tight">
            {chat?.isGroup ? chat?.groupName : other?.name || 'Chat'}
          </h2>
          <p className="text-[10px] text-gray-500">
            {other?.isOnline ? '🟢 Online' : 'Offline'}
          </p>
        </div>
        <button
          onClick={handleClose}
          className="p-2 hover:bg-gray-200 rounded-full transition-colors flex-shrink-0"
          title="Close panel"
        >
          <X size={18} className="text-gray-600" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-chat-bg p-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isOwn = msg.senderId === user._id
            return (
              <div
                key={msg._id || idx}
                className={`mb-3 flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs px-3 py-2 rounded-lg ${
                    isOwn
                      ? 'bg-primary text-white rounded-br-none'
                      : 'bg-gray-100 text-gray-800 rounded-bl-none'
                  }`}
                >
                  {msg.content?.text && (
                    <p className="break-words">{msg.content.text}</p>
                  )}
                  {msg.content?.fileUrl && getMediaPreview(msg)}
                  <div className={`text-xs mt-1 flex items-center gap-1 ${isOwn ? 'text-gray-100' : 'text-gray-500'}`}>
                    <span>{getMessageTime(msg.createdAt)}</span>
                    {isOwn && (
                      msg.status === 'read' ? (
                        <CheckCheck size={14} />
                      ) : (
                        <Check size={14} />
                      )
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
      <div className="bg-white border-t border-gray-200 p-4">
        <form onSubmit={handleSend} className="flex gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
          >
            <Paperclip size={20} className="text-gray-600" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />
          <input
            type="text"
            value={text}
            onChange={handleTyping}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={!text.trim() || isUploading}
            className="p-2 bg-primary text-white rounded-full hover:bg-opacity-90 transition-colors disabled:opacity-50"
          >
            <Send size={20} />
          </button>
        </form>
      </div>

      {/* Enlarged Media Modal */}
      {enlargedMedia && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
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

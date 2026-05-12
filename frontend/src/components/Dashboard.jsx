import { useEffect } from 'react'
import { useSocketStore } from '../stores/socketStore'
import { useChatStore } from '../stores/chatStore'
import { useAuthStore } from '../stores/authStore'
import Sidebar from './Sidebar'
import ChatWindow from './ChatWindow'
import SplitChatWindow from './SplitChatWindow'
import toast from 'react-hot-toast'

export default function Dashboard() {
  const { socket, isConnected } = useSocketStore()
  const { fetchChats, activeChat, addMessage, updateMessageStatus, fetchMessages, markAllAsRead, setTyping, dualViewMode } = useChatStore()
  const { user } = useAuthStore()

  useEffect(() => {
    fetchChats()
  }, [fetchChats])

  // Socket handlers for single-view mode (not used in dual-view mode)
  useEffect(() => {
    if (!socket || dualViewMode) return

    socket.on('message:receive', ({ message, chatId }) => {
      // If we're looking at this chat, add the message
      const currentActive = useChatStore.getState().activeChat
      
      if (currentActive?.chatId === chatId) {
        addMessage(message)
        // Send read receipt if we're actively looking at the chat
        socket.emit('message:read', { chatId })
      } else {
        // Notification logic or update unread count
        fetchChats() // update sidebar
        toast(`New message from ${message.senderId === user._id ? 'you' : 'someone'}`)
      }
    })

    socket.on('message:delivered', ({ messageId, chatId }) => {
      updateMessageStatus(messageId, 'delivered')
    })

    socket.on('message:read', ({ chatId, userId }) => {
      // The other user read our messages
      const currentActive = useChatStore.getState().activeChat
      if (currentActive?.chatId === chatId) {
        markAllAsRead(chatId)
      }
    })

    socket.on('user:typing', ({ chatId, userId }) => {
      setTyping(chatId, userId, true)
    })

    socket.on('user:stopTyping', ({ chatId, userId }) => {
      setTyping(chatId, userId, false)
    })
    
    socket.on('user:online', () => fetchChats())
    socket.on('user:offline', () => fetchChats())

    return () => {
      socket.off('message:receive')
      socket.off('message:delivered')
      socket.off('message:read')
      socket.off('user:typing')
      socket.off('user:stopTyping')
      socket.off('user:online')
      socket.off('user:offline')
    }
  }, [socket, addMessage, updateMessageStatus, fetchChats, markAllAsRead, setTyping, user, dualViewMode])

  return (
    <div className="flex h-screen bg-chat-bg overflow-hidden">
      {/* Sidebar for chat list */}
      <div className={`w-full md:w-1/3 bg-white border-r border-gray-200 flex flex-col ${dualViewMode ? 'flex' : activeChat ? 'hidden md:flex' : 'flex'}`}>
        <Sidebar />
      </div>

      {/* Main chat area */}
      {dualViewMode ? (
        <div className="flex-1 flex flex-col">
          <SplitChatWindow />
        </div>
      ) : (
        <div className={`w-full md:w-2/3 flex flex-col ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
          {activeChat ? (
            <ChatWindow />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-chat-bg text-center px-4">
              <div>
                <div className="bg-white p-4 rounded-full inline-block mb-4 shadow-sm text-primary">
                  <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-light text-gray-700 mb-2">WhatsApp Web Clone</h2>
                <p className="text-gray-500">Send and receive messages without keeping your phone online.<br/>Use WhatsApp on up to 4 linked devices and 1 phone at the same time.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

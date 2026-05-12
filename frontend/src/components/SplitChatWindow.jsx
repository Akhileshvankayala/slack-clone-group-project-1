import { useEffect } from 'react'
import { useChatStore } from '../stores/chatStore'
import { useSocketStore } from '../stores/socketStore'
import { useAuthStore } from '../stores/authStore'
import ChatPanel from './ChatPanel'
import toast from 'react-hot-toast'

export default function SplitChatWindow() {
  const { socket } = useSocketStore()
  const { user } = useAuthStore()
  const {
    activeChatLeft,
    activeChatRight,
    messagesLeft,
    messagesRight,
    addMessageLeft,
    addMessageRight,
    updateMessageStatusLeft,
    updateMessageStatusRight,
    markAllAsReadLeft,
    markAllAsReadRight,
    setTyping,
    typingUsers,
    toggleDualView
  } = useChatStore()

  useEffect(() => {
    if (!socket) return

    socket.on('message:receive', ({ message, chatId }) => {
      const state = useChatStore.getState()
      
      // Add message to left panel if it matches
      if (state.activeChatLeft?.chatId === chatId) {
        addMessageLeft(message)
        socket.emit('message:read', { chatId })
      }
      
      // Add message to right panel if it matches
      if (state.activeChatRight?.chatId === chatId) {
        addMessageRight(message)
        socket.emit('message:read', { chatId })
      }
      
      // Show toast if neither panel has this chat
      if (state.activeChatLeft?.chatId !== chatId && state.activeChatRight?.chatId !== chatId) {
        toast(`New message from ${message.senderId === user._id ? 'you' : 'someone'}`)
      }
    })

    socket.on('message:delivered', ({ messageId, chatId }) => {
      const state = useChatStore.getState()
      if (state.activeChatLeft?.chatId === chatId) {
        updateMessageStatusLeft(messageId, 'delivered')
      }
      if (state.activeChatRight?.chatId === chatId) {
        updateMessageStatusRight(messageId, 'delivered')
      }
    })

    socket.on('message:read', ({ chatId, userId }) => {
      const state = useChatStore.getState()
      if (state.activeChatLeft?.chatId === chatId) {
        markAllAsReadLeft(chatId)
      }
      if (state.activeChatRight?.chatId === chatId) {
        markAllAsReadRight(chatId)
      }
    })

    socket.on('user:typing', ({ chatId, userId }) => {
      setTyping(chatId, userId, true)
    })

    socket.on('user:stopTyping', ({ chatId, userId }) => {
      setTyping(chatId, userId, false)
    })

    return () => {
      socket.off('message:receive')
      socket.off('message:delivered')
      socket.off('message:read')
      socket.off('user:typing')
      socket.off('user:stopTyping')
    }
  }, [socket, addMessageLeft, addMessageRight, updateMessageStatusLeft, updateMessageStatusRight, markAllAsReadLeft, markAllAsReadRight, setTyping, user])

  const handleCloseDualView = () => {
    toggleDualView()
  }

  return (
    <div className="w-full h-full flex gap-0">
      {/* Left Panel */}
      <div className="flex-1 border-r border-gray-300">
        {activeChatLeft ? (
          <ChatPanel
            panelId="left"
            chat={activeChatLeft}
            messages={messagesLeft}
            onClose={() => {}}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center bg-chat-bg text-center px-4">
            <div>
              <div className="bg-white p-4 rounded-full inline-block mb-4 shadow-sm text-primary">
                <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                </svg>
              </div>
              <h2 className="text-2xl font-light text-gray-700 mb-2">Left Panel</h2>
              <p className="text-gray-500">Select a chat to open</p>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel */}
      <div className="flex-1">
        {activeChatRight ? (
          <ChatPanel
            panelId="right"
            chat={activeChatRight}
            messages={messagesRight}
            onClose={() => {}}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center bg-chat-bg text-center px-4">
            <div>
              <div className="bg-white p-4 rounded-full inline-block mb-4 shadow-sm text-primary">
                <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                </svg>
              </div>
              <h2 className="text-2xl font-light text-gray-700 mb-2">Right Panel</h2>
              <p className="text-gray-500">Select a chat to open</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

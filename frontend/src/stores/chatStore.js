import { create } from 'zustand'
import { api } from './authStore'
import { useSocketStore } from './socketStore'

export const useChatStore = create((set, get) => ({
  chats: [],
  activeChat: null,
  messages: [],
  isLoadingChats: false,
  isLoadingMessages: false,
  typingUsers: {}, // { chatId: Set(userIds) }

  // Dual-view chat mode
  dualViewMode: false,
  activeChatLeft: null,
  activeChatRight: null,
  messagesLeft: [],
  messagesRight: [],
  isLoadingMessagesLeft: false,
  isLoadingMessagesRight: false,

  fetchChats: async () => {
    set({ isLoadingChats: true })
    try {
      const res = await api.get('/chats')
      const fetchedChats = res.data.chats
      set((state) => {
        let newActiveChat = state.activeChat
        if (state.activeChat) {
          const updatedActiveChat = fetchedChats.find(c => c.chatId === state.activeChat.chatId)
          if (updatedActiveChat) {
            newActiveChat = updatedActiveChat
          }
        }
        return { chats: fetchedChats, isLoadingChats: false, activeChat: newActiveChat }
      })
    } catch (err) {
      console.error(err)
      set({ isLoadingChats: false })
    }
  },

  setActiveChat: (chat) => {
    set({ activeChat: chat })
    get().fetchMessages(chat.chatId)
    // Send read receipt if we have unread messages
    const { socket } = useSocketStore.getState()
    if (socket) {
      socket.emit('message:read', { chatId: chat.chatId })
    }
  },

  fetchMessages: async (chatId) => {
    set({ isLoadingMessages: true })
    try {
      const res = await api.get(`/chats/${chatId}/messages`)
      set({ messages: res.data.messages, isLoadingMessages: false })
    } catch (err) {
      console.error(err)
      set({ isLoadingMessages: false })
    }
  },

  addMessage: (message) => {
    set((state) => ({
      messages: [...state.messages, message]
    }))
  },

  removeMessage: (messageId) => {
    set((state) => ({
      messages: state.messages.filter(m => m._id !== messageId),
      messagesLeft: state.messagesLeft.filter(m => m._id !== messageId),
      messagesRight: state.messagesRight.filter(m => m._id !== messageId)
    }))
  },

  updateMessage: (updatedMessage) => {
    set((state) => ({
      messages: state.messages.map(m => m._id === updatedMessage._id ? updatedMessage : m),
      messagesLeft: state.messagesLeft.map(m => m._id === updatedMessage._id ? updatedMessage : m),
      messagesRight: state.messagesRight.map(m => m._id === updatedMessage._id ? updatedMessage : m)
    }))
  },

  sendMessage: (chatId, text, fileUrl = null, fileType = null) => {
    const { socket } = useSocketStore.getState()
    if (socket) {
      socket.emit('message:send', {
        chatId,
        content: { text, fileUrl, fileType }
      })
    }
  },

  createOrGetChat: async (participantId) => {
    try {
      const res = await api.post('/chats', { participantId })
      await get().fetchChats()
      get().setActiveChat(res.data.chat)
    } catch (err) {
      console.error(err)
    }
  },

  createGroup: async (groupName, participants) => {
    try {
      const res = await api.post('/chats/group', { groupName, participants })
      await get().fetchChats()
      get().setActiveChat(res.data.chat)
    } catch (err) {
      console.error(err)
    }
  },

  uploadFile: async (file) => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.post('/chats/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return res.data // { fileUrl, fileType }
    } catch (err) {
      console.error(err)
      return null
    }
  },

  updateMessageStatus: (messageId, status) => {
    set((state) => ({
      messages: state.messages.map(m => m._id === messageId ? { ...m, status } : m)
    }))
  },
  
  markAllAsRead: (chatId) => {
    set((state) => ({
      messages: state.messages.map(m => m.chatId === chatId ? { ...m, status: 'read' } : m),
      chats: state.chats.map(c => {
        if(c.chatId === chatId) {
           // reset unread count logic can be updated here
           return c
        }
        return c
      })
    }))
  },

  setTyping: (chatId, userId, isTyping) => {
    set((state) => {
      const current = state.typingUsers[chatId] || new Set()
      const newSet = new Set(current)
      if (isTyping) newSet.add(userId)
      else newSet.delete(userId)
      
      return {
        typingUsers: { ...state.typingUsers, [chatId]: newSet }
      }
    })
  },

  // Dual-view mode methods
  toggleDualView: () => {
    set((state) => ({
      dualViewMode: !state.dualViewMode
    }))
  },

  setActiveChatLeft: (chat) => {
    set({ activeChatLeft: chat })
    get().fetchMessagesLeft(chat.chatId)
    const { socket } = useSocketStore.getState()
    if (socket) {
      socket.emit('message:read', { chatId: chat.chatId })
    }
  },

  setActiveChatRight: (chat) => {
    set({ activeChatRight: chat })
    get().fetchMessagesRight(chat.chatId)
    const { socket } = useSocketStore.getState()
    if (socket) {
      socket.emit('message:read', { chatId: chat.chatId })
    }
  },

  fetchMessagesLeft: async (chatId) => {
    set({ isLoadingMessagesLeft: true })
    try {
      const res = await api.get(`/chats/${chatId}/messages`)
      set({ messagesLeft: res.data.messages, isLoadingMessagesLeft: false })
    } catch (err) {
      console.error(err)
      set({ isLoadingMessagesLeft: false })
    }
  },

  fetchMessagesRight: async (chatId) => {
    set({ isLoadingMessagesRight: true })
    try {
      const res = await api.get(`/chats/${chatId}/messages`)
      set({ messagesRight: res.data.messages, isLoadingMessagesRight: false })
    } catch (err) {
      console.error(err)
      set({ isLoadingMessagesRight: false })
    }
  },

  addMessageLeft: (message) => {
    set((state) => ({
      messagesLeft: [...state.messagesLeft, message]
    }))
  },

  addMessageRight: (message) => {
    set((state) => ({
      messagesRight: [...state.messagesRight, message]
    }))
  },

  closeChatPanel: (panel) => {
    if (panel === 'left') {
      set({ activeChatLeft: null, messagesLeft: [] })
    } else if (panel === 'right') {
      set({ activeChatRight: null, messagesRight: [] })
    }
  },

  updateMessageStatusLeft: (messageId, status) => {
    set((state) => ({
      messagesLeft: state.messagesLeft.map(m => m._id === messageId ? { ...m, status } : m)
    }))
  },

  updateMessageStatusRight: (messageId, status) => {
    set((state) => ({
      messagesRight: state.messagesRight.map(m => m._id === messageId ? { ...m, status } : m)
    }))
  },

  markAllAsReadLeft: (chatId) => {
    set((state) => ({
      messagesLeft: state.messagesLeft.map(m => m.chatId === chatId ? { ...m, status: 'read' } : m)
    }))
  },

  markAllAsReadRight: (chatId) => {
    set((state) => ({
      messagesRight: state.messagesRight.map(m => m.chatId === chatId ? { ...m, status: 'read' } : m)
    }))
  },

  addParticipants: async (chatId, participantIds) => {
    try {
      const res = await api.post(`/chats/${chatId}/participants`, { participants: participantIds })
      const updatedChat = res.data.chat
      set((state) => ({
        activeChat: state.activeChat?.chatId === chatId ? updatedChat : state.activeChat,
        chats: state.chats.map(c => c.chatId === chatId ? updatedChat : c)
      }))
      return { success: true }
    } catch (err) {
      console.error(err)
      return { success: false, message: err.response?.data?.message || 'Failed to add participants' }
    }
  },

  removeParticipant: async (chatId, participantId) => {
    try {
      const res = await api.delete(`/chats/${chatId}/participants/${participantId}`)
      const updatedChat = res.data.chat
      set((state) => ({
        activeChat: state.activeChat?.chatId === chatId ? updatedChat : state.activeChat,
        chats: state.chats.map(c => c.chatId === chatId ? updatedChat : c)
      }))
      return { success: true }
    } catch (err) {
      console.error(err)
      return { success: false, message: err.response?.data?.message || 'Failed to remove participant' }
    }
  },

  updateMessagesStatus: (messageIds, status) => {
    set((state) => ({
      messages: state.messages.map(m => messageIds.includes(m._id) ? { ...m, status } : m)
    }))
  }
}))


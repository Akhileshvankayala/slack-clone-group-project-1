import { create } from 'zustand'
import { io } from 'socket.io-client'
import { useAuthStore } from './authStore'

export const useSocketStore = create((set, get) => ({
  socket: null,
  isConnected: false,

  connectSocket: () => {
    const { token } = useAuthStore.getState()
    if (!token) return

    const socket = io('http://localhost:4000', {
      auth: { token }
    })

    socket.on('connect', () => {
      set({ isConnected: true })
    })

    socket.on('disconnect', () => {
      set({ isConnected: false })
    })

    set({ socket })
  },

  disconnectSocket: () => {
    const { socket } = get()
    if (socket) {
      socket.disconnect()
      set({ socket: null, isConnected: false })
    }
  }
}))

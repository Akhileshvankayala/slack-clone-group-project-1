import { create } from 'zustand'
import { io } from 'socket.io-client'
import { useAuthStore } from './authStore'
import { API_BASE_URL } from '../config'

export const useSocketStore = create((set, get) => ({
  socket: null,
  isConnected: false,

  connectSocket: () => {
    const { token } = useAuthStore.getState()
    const { socket: existingSocket } = get()
    if (!token) return
    if (existingSocket) return

    const socket = io(API_BASE_URL, {
      auth: { token }
    })

    socket.on('connect', () => {
      set({ isConnected: true })
    })

    socket.on('disconnect', () => {
      set({ isConnected: false })
    })

    socket.on('connect_error', (err) => {
      console.error('Socket connect error:', err.message)
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

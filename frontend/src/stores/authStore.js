import { create } from 'zustand'
import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:4000/api',
  withCredentials: true
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('chat_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('chat_user')) || null,
  token: localStorage.getItem('chat_token') || null,
  isAuthenticated: !!localStorage.getItem('chat_token'),
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const res = await api.post('/auth/login', { email, password })
      localStorage.setItem('chat_token', res.data.token)
      localStorage.setItem('chat_user', JSON.stringify(res.data.user))
      set({ user: res.data.user, token: res.data.token, isAuthenticated: true, isLoading: false })
      return true
    } catch (err) {
      set({ error: err.response?.data?.message || 'Login failed', isLoading: false })
      return false
    }
  },

  signup: async (name, email, password) => {
    set({ isLoading: true, error: null })
    try {
      await api.post('/auth/signup', { name, email, password })
      set({ isLoading: false })
      return true
    } catch (err) {
      set({ error: err.response?.data?.message || 'Signup failed', isLoading: false })
      return false
    }
  },

  logout: () => {
    localStorage.removeItem('chat_token')
    localStorage.removeItem('chat_user')
    set({ user: null, token: null, isAuthenticated: false })
  },

  updateUser: (updatedData) => set((state) => {
    const newUser = { ...state.user, ...updatedData }
    localStorage.setItem('chat_user', JSON.stringify(newUser))
    return { user: newUser }
  }),

  updateProfile: async (formData) => {
    set({ isLoading: true, error: null })
    try {
      // Do NOT set Content-Type header for multipart/form-data
      // Axios will automatically set it with the correct boundary
      const res = await api.put('/users/profile', formData)
      
      if (!res.data.user) {
        throw new Error('Invalid response from server')
      }
      
      localStorage.setItem('chat_user', JSON.stringify(res.data.user))
      set({ user: res.data.user, isLoading: false })
      return { success: true, message: res.data.message }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Update failed'
      console.error('Profile update error:', errorMsg)
      set({ error: errorMsg, isLoading: false })
      return { success: false, message: errorMsg }
    }
  }
}))

export { api }

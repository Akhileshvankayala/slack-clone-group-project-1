import { Routes, Route, Navigate } from 'react-router'
import { Toaster } from 'react-hot-toast'
import Login from './components/Login'
import Signup from './components/Signup'
import Dashboard from './components/Dashboard'
import { useAuthStore } from './stores/authStore'
import { useSocketStore } from './stores/socketStore'
import { useEffect } from 'react'

function App() {
  const { isAuthenticated, user } = useAuthStore()
  const { connectSocket, disconnectSocket } = useSocketStore()

  useEffect(() => {
    if (isAuthenticated && user) {
      connectSocket()
    } else {
      disconnectSocket()
    }
    return () => disconnectSocket()
  }, [isAuthenticated, user, connectSocket, disconnectSocket])

  return (
    <>
      <Toaster position="top-center" />
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
        <Route path="/signup" element={!isAuthenticated ? <Signup /> : <Navigate to="/" />} />
        <Route path="/" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} />
      </Routes>
    </>
  )
}

export default App
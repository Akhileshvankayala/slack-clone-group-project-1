import { useEffect, useState } from 'react'
import { useSocketStore } from '../stores/socketStore'
import { useChatStore } from '../stores/chatStore'
import { useAuthStore, api } from '../stores/authStore'
import Sidebar from './Sidebar'
import ChatWindow from './ChatWindow'
import SplitChatWindow from './SplitChatWindow'
import Profile from './Profile'
import UserProfile from './UserProfile'
import toast from 'react-hot-toast'
import { 
  X, Search, Bell, HelpCircle, History, Sparkles, 
  Moon, ArrowLeft, ArrowRight, Hash, MessageSquare, 
  ShieldAlert, Cpu, Home, MoreHorizontal
} from 'lucide-react'

export default function Dashboard() {
  const { socket, isConnected } = useSocketStore()
  const { 
    chats, fetchChats, activeChat, setActiveChat, addMessage, 
    updateMessageStatus, fetchMessages, markAllAsRead, setTyping, 
    dualViewMode, removeMessage, updateMessage, toggleDualView,
    createOrGetChat
  } = useChatStore()
  const { user } = useAuthStore()

  // State hooks for interactive UI components
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false)
  const [showActivityPanel, setShowActivityPanel] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [showSearchOverlay, setShowSearchOverlay] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [showHistoryMenu, setShowHistoryMenu] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [activeRailTab, setActiveRailTab] = useState('home')

  // Search overlay states
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState({ channels: [], users: [], messages: [] })
  const [isSearching, setIsSearching] = useState(false)

  // Session Navigation history stack
  const [navHistory, setNavHistory] = useState([])
  const [navIndex, setNavIndex] = useState(-1)

  useEffect(() => {
    fetchChats()
  }, [fetchChats])

  // Track session navigation history stack dynamically
  useEffect(() => {
    if (!activeChat) return

    // Avoid adding history step if traversing via back/forward arrow
    const currentHistChat = navHistory[navIndex]
    if (currentHistChat?.chatId === activeChat.chatId) return

    // Insert new chat in stack, clearing out any "forward" traversal history
    const newHistory = navHistory.slice(0, navIndex + 1)
    newHistory.push(activeChat)
    setNavHistory(newHistory)
    setNavIndex(newHistory.length - 1)
  }, [activeChat])

  // Navigation handlers
  const handleNavBack = () => {
    if (navIndex > 0) {
      const nextIndex = navIndex - 1
      setNavIndex(nextIndex)
      setActiveChat(navHistory[nextIndex])
      toast.success("Navigated backward")
    }
  }

  const handleNavForward = () => {
    if (navIndex < navHistory.length - 1) {
      const nextIndex = navIndex + 1
      setNavIndex(nextIndex)
      setActiveChat(navHistory[nextIndex])
      toast.success("Navigated forward")
    }
  }

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearchOverlay(prev => !prev)
      }
      if (e.key === 'Escape') {
        setShowWorkspaceMenu(false)
        setShowActivityPanel(false)
        setShowMoreMenu(false)
        setShowSearchOverlay(false)
        setShowHelpModal(false)
        setShowHistoryMenu(false)
        setShowProfile(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Debounced search hook
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ channels: [], users: [], messages: [] })
      return
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await api.get(`/chats/search?q=${searchQuery}`)
        setSearchResults(res.data)
      } catch (err) {
        console.error("Search API Error:", err)
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery])

  // Generate unique list of 5 most recent chats visited
  const recentChats = Array.from(new Set(navHistory.map(c => c.chatId)))
    .map(id => navHistory.find(c => c.chatId === id))
    .reverse()
    .slice(0, 5)

  // Socket handlers for single-view mode (not used in dual-view mode)
  useEffect(() => {
    if (!socket || dualViewMode) return

    socket.on('message:receive', ({ message, chatId }) => {
      const currentActive = useChatStore.getState().activeChat
      
      if (currentActive?.chatId === chatId) {
        addMessage(message)
        socket.emit('message:read', { chatId })
      } else {
        fetchChats() // update sidebar unread counts
        toast(`New message from ${message.senderId === user._id ? 'you' : 'someone'}`)
      }
    })

    socket.on('message:delivered', ({ messageId, chatId }) => {
      updateMessageStatus(messageId, 'delivered')
    })

    socket.on('message:read', ({ chatId, userId }) => {
      const currentActive = useChatStore.getState().activeChat
      if (currentActive?.chatId === chatId) {
        markAllAsRead(chatId)
      }
    })

    socket.on('message:updated', ({ message, chatId }) => {
      updateMessage(message)
    })

    socket.on('message:deleted', ({ messageId, chatId }) => {
      removeMessage(messageId)
      fetchChats()
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
      socket.off('message:updated')
      socket.off('message:deleted')
      socket.off('user:typing')
      socket.off('user:stopTyping')
      socket.off('user:online')
      socket.off('user:offline')
    }
  }, [socket, addMessage, updateMessageStatus, fetchChats, markAllAsRead, setTyping, removeMessage, user, dualViewMode])

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden text-gray-900 font-sans select-none relative">
      {/* 🔹 Slack Global Top Header */}
      <div className="h-11 bg-slack-purple-dark border-b border-white/10 flex items-center justify-between px-4 text-white text-xs flex-shrink-0 z-30 shadow-sm">
        {/* Left side: Navigation History Control */}
        <div className="flex items-center gap-6 w-1/4">
          <div className="flex gap-3 text-white/50">
            <button 
              disabled={navIndex <= 0}
              onClick={handleNavBack}
              className={`p-1 rounded hover:bg-white/10 transition-colors ${navIndex > 0 ? 'cursor-pointer text-white hover:text-emerald-400' : 'cursor-not-allowed text-white/30'}`}
              title="Go Back"
            >
              <ArrowLeft size={15} />
            </button>
            <button 
              disabled={navIndex >= navHistory.length - 1}
              onClick={handleNavForward}
              className={`p-1 rounded hover:bg-white/10 transition-colors ${navIndex < navHistory.length - 1 ? 'cursor-pointer text-white hover:text-emerald-400' : 'cursor-not-allowed text-white/30'}`}
              title="Go Forward"
            >
              <ArrowRight size={15} />
            </button>
          </div>
          
          {/* History / Recent items clock trigger */}
          <div className="relative">
            <button
              onClick={() => setShowHistoryMenu(prev => !prev)}
              className="p-1.5 rounded-md hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
              title="Recent Items History"
            >
              <History size={15} />
            </button>
            
            {/* History Clock Dropdown Menu */}
            {showHistoryMenu && (
              <div className="absolute left-0 top-8 z-50 bg-white rounded-lg shadow-2xl border border-gray-200 p-2 w-64 text-gray-800 animate-in fade-in duration-100">
                <div className="px-3 py-1.5 border-b border-gray-150 flex items-center gap-1.5">
                  <History size={13} className="text-gray-400" />
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Recently Visited Chats</span>
                </div>
                <div className="py-1 max-h-56 overflow-y-auto">
                  {recentChats.length === 0 ? (
                    <p className="px-3 py-2 text-[11px] text-gray-400 italic">No visited chats in this session.</p>
                  ) : (
                    recentChats.map((chat, idx) => {
                      if (!chat) return null;
                      const chatName = chat.isGroup 
                        ? chat.groupName 
                        : (chat.participants.find(p => p._id !== user._id)?.name || "Direct Message")
                      return (
                        <button
                          key={`${chat.chatId}-${idx}`}
                          onClick={() => {
                            setActiveChat(chat)
                            setShowHistoryMenu(false)
                          }}
                          className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-slate-50 flex items-center gap-2 rounded transition-colors"
                        >
                          {chat.isGroup ? <Hash size={13} className="text-gray-400" /> : <MessageSquare size={13} className="text-gray-400" />}
                          <span className="truncate font-medium">{chatName}</span>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center: Global Search Bar */}
        <div 
          onClick={() => setShowSearchOverlay(true)}
          className="flex-1 max-w-xl relative flex items-center bg-white/10 border border-white/20 rounded-md px-3 py-1 cursor-pointer hover:bg-white/15 text-white/70 justify-center gap-2 transition-all"
        >
          <Search size={14} className="text-white/60" />
          <span className="text-[11px] font-medium">Search Workspace (Ctrl + K)</span>
        </div>

        {/* Right side: Help and Quick Profile settings */}
        <div className="w-1/4 flex justify-end items-center gap-3">
          <button 
            onClick={() => setShowHelpModal(true)}
            className="p-1 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
            title="Help / Keyboard Shortcuts"
          >
            <HelpCircle size={17} />
          </button>
          
          <button 
            onClick={() => setShowProfile(true)}
            className="w-7 h-7 rounded-md bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center font-bold text-xs text-white border border-white/10 shadow-sm cursor-pointer transition-all hover:scale-105"
            title="Edit Profile"
          >
            {user?.name?.charAt(0).toUpperCase()}
          </button>
        </div>
      </div>

      {/* 🔹 Main Workspace Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Workspace Rail (Far Left) */}
        <div className="w-16 bg-slack-purple-dark border-r border-white/10 flex flex-col items-center py-4 justify-between text-white/60 flex-shrink-0 z-20">
          <div className="flex flex-col items-center gap-6 w-full">
            {/* Workspace Switcher 'W' Button */}
            <div className="relative group w-full flex justify-center">
              <button 
                onClick={() => setShowWorkspaceMenu(prev => !prev)}
                className="w-9 h-9 rounded-lg bg-white/15 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-all font-bold shadow-md hover:scale-105 border border-white/10"
                title="Workspace Switcher"
              >
                W
              </button>
              
              {/* Sidebar Active Indicator Indicator */}
              <div className="absolute left-0 top-2 bottom-2 w-1 bg-emerald-500 rounded-r shadow-xs"></div>
            </div>
            
            {/* Navigation Rail Icons */}
            <div className="flex flex-col items-center gap-5 w-full">
              {/* Home Icon */}
              <button 
                onClick={() => {
                  setActiveChat(null)
                  setActiveRailTab('home')
                  toast.success("Returned to home dashboard")
                }}
                className={`p-2 rounded-lg cursor-pointer transition-all hover:scale-105 duration-150 ${activeRailTab === 'home' && !activeChat ? 'bg-white/15 text-white shadow-xs' : 'hover:bg-white/10 text-white/60 hover:text-white'}`} 
                title="Home Feed"
              >
                <Home size={19} />
              </button>

              {/* DMs Icon / Split-view panel toggle */}
              <button 
                onClick={() => {
                  setActiveRailTab('dms')
                  toggleDualView()
                  toast.success(dualViewMode ? "Closed Split Panel view" : "Enabled Split Panel dual view!")
                }}
                className={`p-2 rounded-lg cursor-pointer transition-all hover:scale-105 duration-150 ${dualViewMode ? 'bg-white/15 text-white shadow-xs' : 'hover:bg-white/10 text-white/60 hover:text-white'}`} 
                title="Split Panel View"
              >
                <MessageSquare size={19} />
              </button>

              {/* Activity Center Bell Icon */}
              <button 
                onClick={() => setShowActivityPanel(prev => !prev)}
                className={`p-2 rounded-lg cursor-pointer transition-all hover:scale-105 duration-150 ${showActivityPanel ? 'bg-white/15 text-white shadow-xs animate-none' : 'hover:bg-white/10 text-white/60 hover:text-white animate-pulse'}`} 
                title="Activity Feed"
              >
                <Bell size={19} />
              </button>

              {/* More Actions Three Dots */}
              <button 
                onClick={() => setShowMoreMenu(prev => !prev)}
                className={`p-2 rounded-lg cursor-pointer transition-all hover:bg-white/10 text-white/60 hover:text-white hover:scale-105`} 
                title="More Controls"
              >
                <MoreHorizontal size={19} />
              </button>
            </div>
          </div>

          {/* Bottom Rail User Avatar settings */}
          <div className="w-full flex flex-col items-center gap-4">
            <button 
              onClick={() => setShowProfile(true)}
              className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white text-xs cursor-pointer border border-white/20 hover:border-white transition-all shadow-md hover:scale-105"
              title={`Edit profile: ${user?.name}`}
            >
              {user?.name?.charAt(0).toUpperCase()}
            </button>
          </div>
        </div>

        {/* Sidebar container */}
        <div className={`w-full md:w-64 bg-slack-purple border-r border-slack-purple-dark/20 flex flex-col flex-shrink-0 ${dualViewMode ? 'flex' : activeChat ? 'hidden md:flex' : 'flex'}`}>
          <Sidebar />
        </div>

        {/* Main chat window / welcome container */}
        {dualViewMode ? (
          <div className="flex-1 flex flex-col min-w-0 bg-white">
            <SplitChatWindow />
          </div>
        ) : (
          <div className={`flex-1 flex flex-col min-w-0 bg-white ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
            {activeChat ? (
              <ChatWindow />
            ) : (
              <div className="flex-1 flex items-center justify-center bg-white text-center px-6 animate-in fade-in duration-200">
                <div className="max-w-md">
                  <div className="bg-slack-hover-bg p-6 rounded-2xl inline-block mb-4 border border-gray-150 shadow-sm text-slack-purple animate-bounce duration-1000">
                    <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to Slack Workspace</h2>
                  <p className="text-gray-500 text-sm leading-relaxed mb-4">
                    This is your team's central coordination space. Select a channel or direct message from the sidebar to begin messaging in real-time.
                  </p>
                  <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">
                    Quick Tip: Try pressing <kbd className="bg-slate-100 border border-gray-300 rounded px-1.5 py-0.5 font-bold shadow-2xs">Ctrl + K</kbd> to open Search overlay
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 🔹 Workspace Switcher / Info Dropdown Overlay */}
      {showWorkspaceMenu && (
        <div className="absolute left-16 top-16 z-50 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 w-72 animate-in fade-in zoom-in-95 duration-150 text-gray-850">
          <div className="flex items-center justify-between pb-2 border-b border-gray-150">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slack-purple text-white flex items-center justify-center font-bold text-base shadow-md">
                W
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-900">Slack Dev Workspace</h4>
                <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider">Active Dev Mode</p>
              </div>
            </div>
            <button onClick={() => setShowWorkspaceMenu(false)} className="hover:bg-slate-100 p-1 rounded-full"><X size={14} className="text-gray-400" /></button>
          </div>
          <div className="py-3 space-y-2 border-b border-gray-150 text-xs">
            <div className="flex justify-between text-gray-500">
              <span>Group Channels</span>
              <span className="font-bold text-gray-800">{chats.filter(c => c.isGroup).length}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Direct Messages</span>
              <span className="font-bold text-gray-800">{chats.filter(c => !c.isGroup).length}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Active Server Port</span>
              <span className="font-bold text-emerald-600">4000 (Express)</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Vite Frontend Port</span>
              <span className="font-bold text-slack-active">5173 (React 19)</span>
            </div>
          </div>
          <div className="pt-2">
            <button 
              onClick={() => {
                setShowWorkspaceMenu(false)
                toast.success("Workspace details refreshed successfully!")
              }}
              className="w-full text-center bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-bold py-1.5 rounded transition-all cursor-pointer"
            >
              Refresh Workspace Details
            </button>
          </div>
        </div>
      )}

      {/* 🔹 Slide-over Activity Feed Drawer Panel */}
      {showActivityPanel && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setShowActivityPanel(false)}
          ></div>
          
          <div className="relative w-80 h-full bg-white shadow-2xl border-l border-gray-200 flex flex-col animate-in slide-in-from-right duration-250 z-10">
            <div className="h-14 border-b border-gray-200 px-4 flex items-center justify-between bg-slack-purple text-white">
              <div className="flex items-center gap-2">
                <Bell size={18} />
                <span className="font-bold text-sm">Activity & Notifications</span>
              </div>
              <button 
                onClick={() => setShowActivityPanel(false)}
                className="hover:bg-white/10 p-1.5 rounded-md transition-colors text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="bg-slack-hover-bg p-3.5 rounded-lg border border-gray-200 text-gray-800">
                <h4 className="text-xs font-bold text-gray-700 flex items-center gap-1.5 mb-1">
                  <Sparkles size={14} className="text-emerald-500" />
                  Live Sync status
                </h4>
                <p className="text-[11px] text-gray-500 leading-normal font-medium">
                  {chats.reduce((acc, c) => acc + (c.unreadCount?.[user._id] || 0), 0) > 0 ? (
                    `You have ${chats.reduce((acc, c) => acc + (c.unreadCount?.[user._id] || 0), 0)} unread messages in your sidebar channels.`
                  ) : (
                    "No new unread messages. You're all caught up!"
                  )}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 select-none">Direct Message Teammates</h4>
                <div className="space-y-2">
                  {chats.flatMap(c => c.participants)
                    .filter((p, index, self) => p && p._id !== user._id && self.findIndex(x => x?._id === p._id) === index)
                    .map(p => (
                      <div 
                        key={p._id}
                        onClick={async () => {
                          await createOrGetChat(p._id)
                          setShowActivityPanel(false)
                          toast.success(`Chatting with ${p.name}`)
                        }}
                        className="flex items-center justify-between p-2 hover:bg-slate-50 border border-transparent hover:border-gray-150 rounded-lg cursor-pointer transition-all"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative">
                            <div className="w-8 h-8 rounded bg-emerald-600 flex items-center justify-center font-bold text-white text-xs overflow-hidden">
                              {p.profilePic ? (
                                <img src={p.profilePic.startsWith('http') ? p.profilePic : `http://localhost:4000${p.profilePic}`} alt={p.name} className="w-full h-full object-cover" />
                              ) : (
                                p.name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-white ${p.isOnline ? 'bg-emerald-500' : 'bg-gray-300'}`}></span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-800 truncate">{p.name}</p>
                            <p className="text-[10px] text-gray-400 truncate">{p.isOnline ? 'Active now' : 'Away'}</p>
                          </div>
                        </div>
                        <button className="text-[9px] bg-slack-active/10 hover:bg-slack-active text-slack-active hover:text-white px-2 py-1 rounded font-bold transition-all cursor-pointer">
                          DM
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🔹 More Controls Menu Dropdown Card */}
      {showMoreMenu && (
        <div className="absolute left-16 bottom-16 z-50 bg-white rounded-lg shadow-2xl border border-gray-200 p-2.5 w-60 animate-in fade-in slide-in-from-bottom duration-150 text-gray-800">
          <div className="py-1 space-y-1">
            <button 
              onClick={() => {
                document.documentElement.classList.toggle('dark')
                toast.success("Mock Theme preference saved!")
                setShowMoreMenu(false)
              }}
              className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-slate-50 flex items-center gap-2 rounded transition-colors cursor-pointer"
            >
              <Moon size={14} className="text-gray-500" />
              Toggle Mock Dark Mode
            </button>

            <button 
              onClick={() => {
                toast((t) => (
                  <span className="flex flex-col gap-1 text-[11px] text-gray-800">
                    <span className="font-bold text-xs flex items-center gap-1"><Cpu size={12} className="text-slack-purple" /> Workspace Platform Specs:</span>
                    <span>• Sockets Connected: {isConnected ? 'Yes' : 'No'}</span>
                    <span>• Express API URL: http://localhost:4000</span>
                    <span>• Frontend Bundle: Vite HMR React</span>
                  </span>
                ), { duration: 5000 })
                setShowMoreMenu(false)
              }}
              className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-slate-50 flex items-center gap-2 rounded transition-colors cursor-pointer"
            >
              <Sparkles size={14} className="text-emerald-500" />
              Show System Specifications
            </button>

            <div className="h-px bg-gray-150 my-1"></div>

            <button 
              onClick={() => {
                setNavHistory([])
                setNavIndex(-1)
                toast.success("Client history session stack reset successfully!")
                setShowMoreMenu(false)
              }}
              className="w-full text-left px-3 py-2 text-xs text-red-650 hover:bg-red-50 flex items-center gap-2 rounded transition-colors cursor-pointer"
            >
              <ShieldAlert size={14} className="text-red-500" />
              Reset Navigation Cache
            </button>
          </div>
        </div>
      )}

      {/* 🔹 Search Workspace Overlay Floating Modal */}
      {showSearchOverlay && (
        <div className="fixed inset-0 z-50 flex justify-center pt-20">
          <div 
            className="absolute inset-0 bg-black/55 backdrop-blur-xs transition-opacity"
            onClick={() => setShowSearchOverlay(false)}
          ></div>

          <div className="relative bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-xl max-h-[480px] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 z-10 mx-4 text-gray-800">
            {/* Search Input header */}
            <div className="p-4 border-b border-gray-250 flex items-center gap-3">
              <Search size={18} className="text-gray-400" />
              <input
                type="text"
                placeholder="Search channels, users, and message contents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 outline-none text-sm text-gray-800 bg-transparent placeholder-gray-400"
                autoFocus
              />
              {searchQuery.trim() && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="text-xs font-bold text-gray-400 hover:text-gray-600 uppercase transition-colors"
                >
                  Clear
                </button>
              )}
              <button 
                onClick={() => setShowSearchOverlay(false)}
                className="text-xs font-bold text-gray-400 hover:text-gray-600 border border-gray-200 rounded px-1.5 py-0.5 transition-colors"
              >
                ESC
              </button>
            </div>

            {/* Results container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {isSearching ? (
                <div className="flex items-center justify-center py-12 gap-2 text-xs text-gray-500 font-bold">
                  <span className="w-4 h-4 rounded-full border-2 border-slack-purple border-t-transparent animate-spin"></span>
                  Searching Workspace...
                </div>
              ) : !searchQuery.trim() ? (
                <div className="text-center py-12 text-gray-400">
                  <Search size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-xs font-bold">Search everything instantly</p>
                  <p className="text-[10px] mt-1 text-gray-400">Query message logs, channels, and team member profiles</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Channels section */}
                  {searchResults.channels?.length > 0 && (
                    <div>
                      <h5 className="text-[10px] uppercase font-bold tracking-wider text-gray-400 mb-1.5">Channels</h5>
                      <div className="space-y-1">
                        {searchResults.channels.map(ch => (
                          <div
                            key={ch.chatId}
                            onClick={() => {
                              setActiveChat(ch)
                              setShowSearchOverlay(false)
                              setSearchQuery('')
                              toast.success(`Opened Channel #${ch.groupName}`)
                            }}
                            className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg cursor-pointer border border-transparent hover:border-gray-100 transition-all text-xs font-semibold text-gray-800"
                          >
                            <Hash size={14} className="text-gray-400" />
                            <span>{ch.groupName}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Users section */}
                  {searchResults.users?.length > 0 && (
                    <div>
                      <h5 className="text-[10px] uppercase font-bold tracking-wider text-gray-400 mb-1.5">Teammates</h5>
                      <div className="space-y-1">
                        {searchResults.users.map(u => (
                          <div
                            key={u._id}
                            onClick={async () => {
                              await createOrGetChat(u._id)
                              setShowSearchOverlay(false)
                              setSearchQuery('')
                              toast.success(`Opened chat with ${u.name}`)
                            }}
                            className="flex items-center gap-2.5 p-2 hover:bg-slate-50 rounded-lg cursor-pointer border border-transparent hover:border-gray-100 transition-all text-xs text-gray-850"
                          >
                            <div className="w-6 h-6 rounded bg-emerald-600 flex items-center justify-center font-bold text-white text-[10px] overflow-hidden">
                              {u.profilePic ? (
                                <img src={u.profilePic.startsWith('http') ? u.profilePic : `http://localhost:4000${u.profilePic}`} alt={u.name} className="w-full h-full object-cover" />
                              ) : (
                                u.name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold truncate">{u.name}</p>
                              <p className="text-[9px] text-gray-400 truncate">{u.email}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Messages matches */}
                  {searchResults.messages?.length > 0 && (
                    <div>
                      <h5 className="text-[10px] uppercase font-bold tracking-wider text-gray-400 mb-1.5">Matching message content</h5>
                      <div className="space-y-1">
                        {searchResults.messages.map(m => (
                          <div
                            key={m._id}
                            onClick={async () => {
                              const existingChat = chats.find(c => c.chatId === m.chatId)
                              if (existingChat) {
                                setActiveChat(existingChat)
                              } else {
                                await createOrGetChat(m.sender?._id)
                              }
                              setShowSearchOverlay(false)
                              setSearchQuery('')
                              toast.success(`Jumped to message`)
                            }}
                            className="p-2.5 hover:bg-slate-50 rounded-lg cursor-pointer border border-transparent hover:border-gray-100 transition-all text-xs flex flex-col gap-1 min-w-0 text-gray-850"
                          >
                            <div className="flex justify-between items-center text-[10px] text-gray-400">
                              <span className="font-bold text-gray-700">{m.sender?.name} {m.chatName ? `in #${m.chatName}` : 'in Direct Message'}</span>
                              <span>{new Date(m.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-gray-600 truncate italic font-medium">"{m.content?.text}"</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No matches */}
                  {searchResults.channels?.length === 0 && searchResults.users?.length === 0 && searchResults.messages?.length === 0 && (
                    <div className="text-center py-10">
                      <Search size={28} className="mx-auto text-gray-300 mb-2" />
                      <p className="text-xs text-gray-500 font-bold">No results found for "{searchQuery}"</p>
                      <p className="text-[10px] text-gray-400 mt-1">Try general phrases or other keywords</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🔹 Keyboard Shortcuts / Guide Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setShowHelpModal(false)}
          ></div>
          
          <div className="relative bg-white rounded-xl shadow-2xl border border-gray-250 p-6 w-full max-w-md animate-in zoom-in-95 duration-200 z-10 mx-4 text-gray-850">
            <div className="flex justify-between items-center pb-4 border-b border-gray-150 mb-4">
              <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                <HelpCircle className="text-slack-purple animate-spin duration-[4000ms]" size={18} />
                Workspace Guide & Shortcuts
              </h3>
              <button onClick={() => setShowHelpModal(false)} className="hover:bg-slate-100 p-1 rounded-full text-gray-450 transition-colors">
                <X size={16} />
              </button>
            </div>
            
            <div className="space-y-4 text-xs text-gray-600 leading-normal">
              <p className="font-medium text-gray-800">Use these helpful workspace keyboard triggers to navigate efficiently:</p>
              
              <div className="space-y-2.5">
                <div className="flex justify-between items-center py-1 border-b border-dashed border-gray-150">
                  <span className="font-semibold text-gray-700">Search Workspace Dialog</span>
                  <kbd className="bg-gray-100 border border-gray-300 rounded px-1.5 py-0.5 text-[10px] font-bold text-gray-700 shadow-2xs">Ctrl + K</kbd>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-dashed border-gray-150">
                  <span className="font-semibold text-gray-700">Toggle Split Screen View</span>
                  <kbd className="bg-gray-100 border border-gray-300 rounded px-1.5 py-0.5 text-[10px] font-bold text-gray-700 shadow-2xs">DMs Icon (Left Rail)</kbd>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-dashed border-gray-150">
                  <span className="font-semibold text-gray-700">Go Back to Welcome landing</span>
                  <kbd className="bg-gray-100 border border-gray-300 rounded px-1.5 py-0.5 text-[10px] font-bold text-gray-700 shadow-2xs">Home Icon (Left Rail)</kbd>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-dashed border-gray-150">
                  <span className="font-semibold text-gray-700">Close Overlay / Menu Dialog</span>
                  <kbd className="bg-gray-100 border border-gray-300 rounded px-1.5 py-0.5 text-[10px] font-bold text-gray-700 shadow-2xs">ESC</kbd>
                </div>
              </div>
              
              <p className="text-[10px] text-gray-400 italic text-center pt-2 select-none">Powered by Antigravity Agentic Coding Engine</p>
            </div>
          </div>
        </div>
      )}

      {/* 🔹 Profile Modals Edit */}
      {showProfile && (
        <div className="fixed inset-0 bg-white z-[60] flex flex-col h-full text-gray-900">
          <Profile onClose={() => setShowProfile(false)} />
        </div>
      )}
    </div>
  )
}

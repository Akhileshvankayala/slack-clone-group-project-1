import { useState, useEffect } from 'react'
import { useAuthStore, api } from '../stores/authStore'
import { useChatStore } from '../stores/chatStore'
import { Search, MoreVertical, MessageSquarePlus, LogOut, Check, CheckCheck, Users, X, Copy, ChevronDown, ChevronRight, Hash, Plus, MessageSquare } from 'lucide-react'
import { format } from 'date-fns'
import Profile from './Profile'
import UserProfile from './UserProfile'

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const {
    chats,
    activeChat,
    setActiveChat,
    createOrGetChat,
    createGroup,
    dualViewMode,
    toggleDualView,
    activeChatLeft,
    activeChatRight,
    setActiveChatLeft,
    setActiveChatRight
  } = useChatStore()
  
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [showPanelSelector, setShowPanelSelector] = useState(false)
  const [selectedChatForPanel, setSelectedChatForPanel] = useState(null)
  
  // Group creation state
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [selectedUsers, setSelectedUsers] = useState([])

  // Profile view state
  const [showProfile, setShowProfile] = useState(false)
  const [showUserProfile, setShowUserProfile] = useState(false)
  const [selectedUserProfile, setSelectedUserProfile] = useState(null)

  // Collapsible section state (Slack style)
  const [channelsExpanded, setChannelsExpanded] = useState(true)
  const [dmsExpanded, setDmsExpanded] = useState(true)

  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/users?search=${search}`)
        setSearchResults(res.data.users.filter(u => u._id !== user._id))
      } catch (err) {
        console.error(err)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [search, user._id])

  const handleStartChat = async (participantId) => {
    if (dualViewMode) {
      const chat = chats.find(c => c.participants.some(p => p._id === participantId))
      if (chat) {
        setSelectedChatForPanel(chat)
        setShowPanelSelector(true)
      } else {
        await createOrGetChat(participantId)
      }
    } else {
      await createOrGetChat(participantId)
    }
    setSearch('')
    setIsSearching(false)
  }

  const handleChatClick = (chat) => {
    if (dualViewMode) {
      setSelectedChatForPanel(chat)
      setShowPanelSelector(true)
    } else {
      setActiveChat(chat)
    }
  }

  const handleOpenInPanel = (panel) => {
    if (panel === 'left') {
      setActiveChatLeft(selectedChatForPanel)
    } else if (panel === 'right') {
      setActiveChatRight(selectedChatForPanel)
    }
    setShowPanelSelector(false)
    setSelectedChatForPanel(null)
  }

  const handleSelectForGroup = (u) => {
    if (!selectedUsers.find(su => su._id === u._id)) {
      setSelectedUsers([...selectedUsers, u])
    }
    setSearch('')
  }

  const handleRemoveFromGroup = (id) => {
    setSelectedUsers(selectedUsers.filter(u => u._id !== id))
  }

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) return
    await createGroup(groupName, selectedUsers.map(u => u._id))
    setShowGroupModal(false)
    setGroupName('')
    setSelectedUsers([])
  }

  const getOtherParticipant = (chat) => {
    return chat.participants.find(p => p._id !== user._id) || chat.participants[0]
  }

  const channels = chats.filter(chat => chat.isGroup)
  const directMessages = chats.filter(chat => !chat.isGroup)

  return (
    <div className="flex flex-col h-full bg-slack-purple text-white/80 select-none">
      {/* 🔹 Workspace Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-slack-purple-dark/30 hover:bg-slack-purple-dark/20 cursor-pointer transition-colors group">
        <div className="flex flex-col min-w-0" onClick={() => setShowProfile(true)}>
          <span className="font-bold text-white text-sm leading-tight flex items-center gap-1.5 truncate">
            Workspace
            <ChevronDown size={14} className="text-white/60 group-hover:text-white" />
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span className="text-[10px] text-white/50 truncate font-medium">{user.name}</span>
          </div>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-1 text-white/60">
          <button 
            className={`hover:bg-white/10 hover:text-white p-1.5 rounded-md transition-all ${dualViewMode ? 'bg-white/10 text-white' : ''}`}
            onClick={toggleDualView}
            title="Toggle Split Panel view"
          >
            <Copy size={16} />
          </button>
          <button 
            className="hover:bg-white/10 hover:text-white p-1.5 rounded-md transition-all" 
            onClick={() => setShowGroupModal(true)} 
            title="Create Channel"
          >
            <Plus size={16} />
          </button>
          <button 
            className="hover:bg-white/10 hover:text-white p-1.5 rounded-md transition-all" 
            onClick={logout} 
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* 🔹 Slack Search Filter Box */}
      <div className="p-3 bg-slack-purple">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={14} className="text-white/40" />
          </div>
          <input
            type="text"
            placeholder="Jump to or start chat..."
            className="w-full bg-white/10 text-white placeholder-white/40 rounded px-8 py-1.5 text-xs focus:outline-none focus:bg-white/15 focus:ring-1 focus:ring-slack-active transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search.trim() && (
            <button 
              onClick={() => setSearch('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/40 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 🔹 Chat / Section Feed */}
      <div className="flex-1 overflow-y-auto scrollbar-custom bg-slack-purple">
        {search.trim() && !showGroupModal ? (
          <div>
            <div className="px-4 py-2 text-white/50 text-[10px] uppercase font-bold tracking-wider">Search Results</div>
            {searchResults.length === 0 ? (
              <div className="px-4 py-3 text-xs text-white/40">No users found.</div>
            ) : (
              searchResults.map(u => (
                <div 
                  key={u._id} 
                  className="flex items-center px-4 py-2 hover:bg-white/5 cursor-pointer border-b border-white/5 transition-all group"
                >
                  <div 
                    onClick={() => { setSelectedUserProfile(u); setShowUserProfile(true); }}
                    className="w-8 h-8 rounded-md bg-white/15 flex items-center justify-center text-white font-bold mr-2.5 flex-shrink-0 overflow-hidden cursor-pointer hover:ring-2 hover:ring-slack-active transition-all"
                  >
                    {u.profilePic ? (
                      <img src={u.profilePic.startsWith('http') ? u.profilePic : `http://localhost:4000${u.profilePic}`} alt={u.name} className="w-full h-full object-cover" />
                    ) : (
                      u.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleStartChat(u._id)}>
                    <h3 className="text-white text-xs font-semibold truncate leading-none">{u.name}</h3>
                    <p className="text-[10px] text-white/40 truncate mt-0.5">{u.email}</p>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setSelectedUserProfile(u); setShowUserProfile(true); }}
                    className="ml-2 px-2.5 py-0.5 text-[10px] bg-slack-active text-white rounded hover:bg-opacity-90 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    View
                  </button>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="py-2 space-y-4">
            {/* 🔹 CHANNELS SECTION */}
            <div>
              <div className="px-2 py-1.5 flex items-center justify-between text-white/40 hover:text-white transition-colors cursor-pointer group/sec">
                <div className="flex items-center gap-1.5" onClick={() => setChannelsExpanded(!channelsExpanded)}>
                  {channelsExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <span className="text-[11px] uppercase tracking-wider font-bold">Channels</span>
                </div>
                <button 
                  onClick={() => setShowGroupModal(true)} 
                  className="opacity-0 group-hover/sec:opacity-100 hover:bg-white/10 p-0.5 rounded transition-all"
                  title="Add Channel"
                >
                  <Plus size={14} />
                </button>
              </div>
              
              {channelsExpanded && (
                <div className="space-y-0.5">
                  {channels.length === 0 ? (
                    <div className="px-6 py-1.5 text-xs text-white/30 italic">No channels yet.</div>
                  ) : (
                    channels.map(chat => {
                      const isActive = activeChat?.chatId === chat.chatId
                      const isOpenLeft = activeChatLeft?.chatId === chat.chatId
                      const isOpenRight = activeChatRight?.chatId === chat.chatId
                      const isOpened = isActive || isOpenLeft || isOpenRight
                      const unreadCount = chat.unreadCount?.[user._id] || 0

                      return (
                        <div
                          key={chat.chatId}
                          onClick={() => handleChatClick(chat)}
                          className={`flex items-center px-4 py-1.5 cursor-pointer transition-all ${isOpened ? 'bg-slack-active text-white font-semibold' : 'hover:bg-white/5 text-white/70'}`}
                        >
                          <Hash size={14} className="mr-2 text-white/40 flex-shrink-0" />
                          <span className="truncate flex-1 text-xs">{chat.groupName}</span>
                          {unreadCount > 0 && (
                            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </div>

            {/* 🔹 DIRECT MESSAGES SECTION */}
            <div>
              <div className="px-2 py-1.5 flex items-center justify-between text-white/40 hover:text-white transition-colors cursor-pointer group/sec">
                <div className="flex items-center gap-1.5" onClick={() => setDmsExpanded(!dmsExpanded)}>
                  {dmsExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <span className="text-[11px] uppercase tracking-wider font-bold">Direct Messages</span>
                </div>
                <button 
                  onClick={() => setIsSearching(true)} 
                  className="opacity-0 group-hover/sec:opacity-100 hover:bg-white/10 p-0.5 rounded transition-all"
                  title="Open Search"
                >
                  <Plus size={14} />
                </button>
              </div>

              {dmsExpanded && (
                <div className="space-y-0.5">
                  {directMessages.length === 0 ? (
                    <div className="px-6 py-1.5 text-xs text-white/30 italic">No conversations.</div>
                  ) : (
                    directMessages.map(chat => {
                      const isActive = activeChat?.chatId === chat.chatId
                      const isOpenLeft = activeChatLeft?.chatId === chat.chatId
                      const isOpenRight = activeChatRight?.chatId === chat.chatId
                      const isOpened = isActive || isOpenLeft || isOpenRight
                      
                      const otherParticipant = getOtherParticipant(chat)
                      const unreadCount = chat.unreadCount?.[user._id] || 0

                      return (
                        <div
                          key={chat.chatId}
                          onClick={() => handleChatClick(chat)}
                          className={`flex items-center px-4 py-1.5 cursor-pointer transition-all ${isOpened ? 'bg-slack-active text-white font-semibold' : 'hover:bg-white/5 text-white/70'}`}
                        >
                          {/* Slack DM status dot indicator */}
                          <span className={`w-2 h-2 rounded-full mr-2.5 flex-shrink-0 ${otherParticipant.isOnline ? 'bg-emerald-500' : 'border border-white/30 bg-transparent'}`}></span>
                          <span className="truncate flex-1 text-xs">{otherParticipant.name}</span>
                          {unreadCount > 0 && (
                            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 🔹 Slack Overlays & Modals */}
      {showProfile && (
        <div className="absolute inset-0 bg-white z-[60] flex flex-col h-full text-gray-900">
          <Profile onClose={() => setShowProfile(false)} />
        </div>
      )}

      {showUserProfile && selectedUserProfile && (
        <div className="absolute inset-0 bg-white z-[60] flex flex-col h-full text-gray-900">
          <UserProfile user={selectedUserProfile} onClose={() => { setShowUserProfile(false); setSelectedUserProfile(null); }} />
        </div>
      )}

      {showGroupModal && (
        <div className="absolute inset-0 bg-white z-[60] flex flex-col h-full text-gray-900">
          <div className="bg-slack-purple text-white h-20 px-6 flex items-end pb-4 font-bold text-base gap-3">
            <button onClick={() => { setShowGroupModal(false); setSelectedUsers([]); setGroupName(''); }} className="hover:bg-white/10 p-1.5 rounded-md">
              <X size={20} />
            </button>
            Create New Channel
          </div>
          <div className="p-6 flex flex-col flex-1 overflow-hidden">
            <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Channel Name</label>
            <input 
              type="text" 
              placeholder="e.g. general-discussions" 
              className="border border-gray-300 rounded px-4 py-2 mb-4 focus:ring-1 focus:ring-slack-active focus:border-slack-active focus:outline-none"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {selectedUsers.map(u => (
                  <div key={u._id} className="bg-gray-100 border border-gray-250 rounded-full pl-3 pr-2 py-0.5 flex items-center gap-1.5 text-xs text-gray-700">
                    {u.name}
                    <button onClick={() => handleRemoveFromGroup(u._id)} className="hover:bg-gray-200 rounded-full p-0.5"><X size={12} className="text-gray-500" /></button>
                  </div>
                ))}
              </div>
            )}
            <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Add Members</label>
            <input
              type="text"
              placeholder="Search people to invite..."
              className="w-full border border-gray-300 rounded px-4 py-2 focus:ring-1 focus:ring-slack-active focus:border-slack-active focus:outline-none mb-2 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex-1 overflow-y-auto border border-gray-100 rounded p-2">
              {search.trim() && searchResults.map(u => (
                <div key={u._id} onClick={() => handleSelectForGroup(u)} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer rounded transition-colors">
                  <div className="w-8 h-8 rounded bg-gray-250 flex items-center justify-center font-bold text-gray-700 mr-2.5 text-sm">{u.name.charAt(0).toUpperCase()}</div>
                  <span className="text-sm font-medium">{u.name}</span>
                </div>
              ))}
            </div>
            {selectedUsers.length > 0 && groupName.trim() && (
              <button onClick={handleCreateGroup} className="bg-emerald-600 text-white py-2.5 rounded shadow hover:bg-emerald-700 transition-colors font-semibold text-sm mt-4">
                Create Channel
              </button>
            )}
          </div>
        </div>
      )}

      {/* Panel Selector Modal */}
      {showPanelSelector && selectedChatForPanel && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-5 max-w-sm w-full mx-4 text-gray-800 shadow-xl border border-gray-200">
            <h3 className="text-base font-bold text-gray-900 mb-2">Open Split Panel</h3>
            <p className="text-xs text-gray-500 mb-5">Open "{selectedChatForPanel.isGroup ? selectedChatForPanel.groupName : getOtherParticipant(selectedChatForPanel).name}" in which split side?</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleOpenInPanel('left')}
                className="flex-1 bg-slack-active hover:bg-opacity-95 text-white font-semibold py-2 rounded text-xs transition-colors"
              >
                Left Panel
              </button>
              <button
                onClick={() => handleOpenInPanel('right')}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 rounded text-xs transition-colors"
              >
                Right Panel
              </button>
            </div>
            <button
              onClick={() => {
                setShowPanelSelector(false)
                setSelectedChatForPanel(null)
              }}
              className="w-full mt-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 rounded text-xs transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

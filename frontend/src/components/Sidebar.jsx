import { useState, useEffect } from 'react'
import { useAuthStore, api } from '../stores/authStore'
import { useChatStore } from '../stores/chatStore'
import { Search, MoreVertical, MessageSquarePlus, LogOut, Check, CheckCheck, Users, X, Copy } from 'lucide-react'
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

  // Filter state
  const [showGroupsOnly, setShowGroupsOnly] = useState(false)

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

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Header */}
      <div className="bg-gray-100 h-16 px-4 flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setShowProfile(true)}>
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg overflow-hidden border-2 border-transparent group-hover:border-primary transition-all">
            {user.profilePic ? (
              <img src={user.profilePic.startsWith('http') ? user.profilePic : `http://localhost:4000${user.profilePic}`} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              user.name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-gray-800 leading-tight">{user.name}</span>
            <span className="text-[10px] text-gray-500 uppercase tracking-tighter">My Profile</span>
          </div>
        </div>
        <div className="flex gap-2 text-gray-600">
          <button
            className={`hover:bg-gray-200 p-2 rounded-full transition-colors ${dualViewMode ? 'bg-primary text-white' : ''}`}
            onClick={toggleDualView}
            title="Toggle dual view"
          >
            <Copy size={20} />
          </button>
          <button 
            className={`hover:bg-gray-200 p-2 rounded-full transition-colors ${showGroupsOnly ? 'bg-primary text-white' : ''}`} 
            onClick={() => setShowGroupsOnly(!showGroupsOnly)} 
            title="View Groups"
          >
            <Users size={20} />
          </button>
          <button 
            className="hover:bg-gray-200 p-2 rounded-full transition-colors" 
            onClick={() => setShowGroupModal(true)} 
            title="Create Group"
          >
            <MessageSquarePlus size={20} />
          </button>
          <button className="hover:bg-gray-200 p-2 rounded-full transition-colors" onClick={logout} title="Logout">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Profile Side Panel Overlay */}
      {showProfile && (
        <div className="absolute inset-0 bg-white z-[60] flex flex-col h-full">
          <Profile onClose={() => setShowProfile(false)} />
        </div>
      )}

      {/* User Profile Overlay */}
      {showUserProfile && selectedUserProfile && (
        <div className="absolute inset-0 bg-white z-[60] flex flex-col h-full">
          <UserProfile user={selectedUserProfile} onClose={() => { setShowUserProfile(false); setSelectedUserProfile(null); }} />
        </div>
      )}

      {/* Group Modal Overlay */}
      {showGroupModal && (
        <div className="absolute inset-0 bg-white z-50 flex flex-col h-full">
          <div className="bg-primary text-white h-24 px-4 flex items-end pb-4 font-semibold text-lg gap-4">
            <button onClick={() => { setShowGroupModal(false); setSelectedUsers([]); setGroupName(''); }} className="hover:bg-primary-dark p-1 rounded-full">
              <X size={24} />
            </button>
            Create New Group
          </div>
          <div className="p-4 flex flex-col flex-1 overflow-hidden">
            <input 
              type="text" 
              placeholder="Group Subject" 
              className="border-b-2 border-primary w-full py-2 mb-4 focus:outline-none"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedUsers.map(u => (
                  <div key={u._id} className="bg-gray-200 rounded-full px-3 py-1 flex items-center gap-2 text-sm">
                    {u.name}
                    <button onClick={() => handleRemoveFromGroup(u._id)}><X size={14} className="text-gray-500" /></button>
                  </div>
                ))}
              </div>
            )}
            <input
              type="text"
              placeholder="Search participants..."
              className="w-full bg-gray-100 rounded-lg px-4 py-2 focus:outline-none mb-2"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex-1 overflow-y-auto">
              {search.trim() && searchResults.map(u => (
                <div key={u._id} onClick={() => handleSelectForGroup(u)} className="flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
                  <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center font-bold mr-3">{u.name.charAt(0).toUpperCase()}</div>
                  <span>{u.name}</span>
                </div>
              ))}
            </div>
            {selectedUsers.length > 0 && groupName.trim() && (
              <button onClick={handleCreateGroup} className="bg-secondary text-white py-3 rounded-lg mt-2 shadow-md hover:bg-green-600 transition-colors font-semibold">
                Create Group
              </button>
            )}
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="p-2 bg-white border-b border-gray-200">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search or start new chat"
            className="w-full bg-gray-100 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-1 focus:ring-primary text-sm transition-colors"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto scrollbar-custom bg-white">
        {search.trim() && !showGroupModal ? (
          <div>
            <div className="px-4 py-2 text-primary text-sm font-medium">Search Results</div>
            {searchResults.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500">No users found.</div>
            ) : (
              searchResults.map(u => (
                <div 
                  key={u._id} 
                  className="flex items-center px-4 py-3 hover:bg-gray-50 border-b border-gray-100 transition-colors group"
                >
                  <div 
                    onClick={() => { setSelectedUserProfile(u); setShowUserProfile(true); }}
                    className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold mr-3 flex-shrink-0 overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                  >
                    {u.profilePic ? (
                      <img src={u.profilePic.startsWith('http') ? u.profilePic : `http://localhost:4000${u.profilePic}`} alt={u.name} className="w-full h-full object-cover" />
                    ) : (
                      u.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleStartChat(u._id)}>
                    <h3 className="text-gray-900 font-medium truncate">{u.name}</h3>
                    <p className="text-sm text-gray-500 truncate">{u.email}</p>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setSelectedUserProfile(u); setShowUserProfile(true); }}
                    className="ml-2 px-3 py-1 text-xs bg-primary text-white rounded-full hover:bg-primary-dark transition-colors opacity-0 group-hover:opacity-100"
                  >
                    View
                  </button>
                </div>
              ))
            )}
          </div>
        ) : (
          chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 px-4 text-center">
              <MessageSquarePlus size={48} className="mb-4 text-gray-300" />
              <p>{showGroupsOnly ? 'No groups found.' : 'No chats yet. Search for a user to start chatting!'}</p>
            </div>
          ) : (
            chats
              .filter(chat => !showGroupsOnly || chat.isGroup)
              .map(chat => {
              const isActive = activeChat?.chatId === chat.chatId
              const isOpenLeft = activeChatLeft?.chatId === chat.chatId
              const isOpenRight = activeChatRight?.chatId === chat.chatId
              const unreadCount = chat.unreadCount?.[user._id] || 0
              
              const displayName = chat.isGroup ? chat.groupName : getOtherParticipant(chat).name
              const initial = displayName.charAt(0).toUpperCase()
              
              return (
                <div 
                  key={chat.chatId} 
                  onClick={() => handleChatClick(chat)}
                  className={`flex items-center px-4 py-3 cursor-pointer border-b border-gray-100 transition-colors relative ${isActive || isOpenLeft || isOpenRight ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                >
                  {/* Panel indicators */}
                  {dualViewMode && (isOpenLeft || isOpenRight) && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
                  )}
                  
                  <div className="relative">
                    <div 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        if (!chat.isGroup) {
                          setSelectedUserProfile(getOtherParticipant(chat));
                          setShowUserProfile(true);
                        }
                      }}
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold mr-3 flex-shrink-0 shadow-sm overflow-hidden cursor-pointer transition-all ${chat.isGroup ? 'bg-gray-500' : 'bg-gradient-to-br from-primary to-primary-dark hover:ring-2 hover:ring-primary'}`}
                    >
                      {chat.isGroup ? (
                        <Users size={20} />
                      ) : (
                        getOtherParticipant(chat).profilePic ? (
                          <img src={getOtherParticipant(chat).profilePic.startsWith('http') ? getOtherParticipant(chat).profilePic : `http://localhost:4000${getOtherParticipant(chat).profilePic}`} alt={displayName} className="w-full h-full object-cover" />
                        ) : (
                          initial
                        )
                      )}
                    </div>
                    {/* Online indicator */}
                    {!chat.isGroup && <div className={`absolute bottom-0 right-3 w-3 h-3 rounded-full border-2 border-white ${getOtherParticipant(chat).isOnline ? 'bg-secondary' : 'bg-gray-400'}`}></div>}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h3 className="text-gray-900 font-medium truncate pr-2">{displayName}</h3>
                      {chat.lastMessageAt && (
                        <span className={`text-xs whitespace-nowrap ${unreadCount > 0 ? 'text-secondary font-medium' : 'text-gray-500'}`}>
                          {format(new Date(chat.lastMessageAt), 'HH:mm')}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <p className={`text-sm truncate pr-2 flex items-center gap-1 ${unreadCount > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                        {chat.lastMessage?.content?.fileUrl && <span className="italic text-gray-400">📎 File attached</span>}
                        {chat.lastMessage?.content?.text || (chat.lastMessage?.content?.fileUrl ? '' : 'Start chatting...')}
                      </p>
                      {unreadCount > 0 && (
                        <div className="bg-secondary text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </div>
                      )}
                    </div>

                    {/* Dual view indicators */}
                    {dualViewMode && (isOpenLeft || isOpenRight) && (
                      <div className="text-xs text-primary mt-1">
                        {isOpenLeft && <span className="mr-2">📍 Left</span>}
                        {isOpenRight && <span>📍 Right</span>}
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )
        )}
      </div>

      {/* Panel Selector Modal */}
      {showPanelSelector && selectedChatForPanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Select Panel</h3>
            <p className="text-gray-600 mb-6">Open "{selectedChatForPanel.isGroup ? selectedChatForPanel.groupName : getOtherParticipant(selectedChatForPanel).name}" in which panel?</p>
            <div className="flex gap-4">
              <button
                onClick={() => handleOpenInPanel('left')}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded-lg transition-colors"
              >
                Left Panel
              </button>
              <button
                onClick={() => handleOpenInPanel('right')}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 rounded-lg transition-colors"
              >
                Right Panel
              </button>
            </div>
            <button
              onClick={() => {
                setShowPanelSelector(false)
                setSelectedChatForPanel(null)
              }}
              className="w-full mt-3 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

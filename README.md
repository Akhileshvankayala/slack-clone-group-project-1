# Slack Clone - Real-Time Chat Application

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-13AA52?style=for-the-badge&logo=mongodb&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socket.io&logoColor=white)

A full-stack real-time chat application inspired by Slack, built with modern web technologies. This project demonstrates a complete implementation of a messaging platform with user authentication, channel management, and real-time communication using WebSockets.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Endpoints](#api-endpoints)
- [Socket Events](#socket-events)
- [Database Schema](#database-schema)
- [Architecture Overview](#architecture-overview)
- [Key Technologies & Integrations](#key-technologies--integrations)
- [Development Workflow](#development-workflow)
- [Contributing](#contributing)
- [Troubleshooting](#troubleshooting)
- [Future Enhancements](#future-enhancements)
- [License](#license)

---

## 🎯 Overview

This Slack Clone is a group project that replicates core Slack functionality including real-time messaging, user authentication, channel management, and file uploads. The application follows a modern full-stack architecture with a React frontend and Node.js/Express backend, leveraging WebSocket technology for real-time communication.

**Project Type:** Educational Group Project  
**Primary Language:** JavaScript (99.3%)  
**Current Status:** Active Development  

---

## ✨ Features

### Core Features Implemented

#### 🔐 Authentication & User Management
- User registration with bcrypt password hashing
- JWT-based authentication system
- Cookie-based session management
- Protected routes with authentication middleware
- User profile management
- User search and discovery functionality

#### 💬 Real-Time Messaging
- Instant message delivery using Socket.IO
- Private direct messages (DMs) between users
- Channel-based messaging
- Message notifications
- Real-time online status tracking
- Typing indicators

#### 📁 Channel Management
- Create, read, update, and delete channels
- Channel member management
- Public and private channels (architecture ready)
- Channel-specific message history
- Channel pinned messages support

#### 📤 File & Media Handling
- Image upload integration with Cloudinary
- File storage and management
- Multer-based file upload processing
- Image compression and optimization
- Media preview in messages

#### 🔔 Additional Features
- User presence tracking
- Message timestamps with formatted display (date-fns)
- Toast notifications for user feedback
- Form validation with react-hook-form
- Responsive design with Tailwind CSS
- Error handling and logging

---

## 🛠 Tech Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| **React** | ^19.2.5 | UI framework and component library |
| **Vite** | ^8.0.10 | Fast build tool and dev server |
| **Tailwind CSS** | ^4.2.4 | Utility-first CSS framework |
| **Socket.IO Client** | ^4.8.3 | Real-time communication with server |
| **React Router** | ^7.14.2 | Client-side routing |
| **Zustand** | ^5.0.12 | Lightweight state management |
| **React Hook Form** | ^7.75.0 | Efficient form management |
| **Axios** | ^1.16.0 | HTTP client for API requests |
| **React Hot Toast** | ^2.6.0 | Toast notification system |
| **Lucide React** | ^1.14.0 | Modern icon library |
| **date-fns** | ^4.1.0 | Date formatting and manipulation |

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Express.js** | ^5.2.1 | Web framework and API server |
| **Node.js** | Latest LTS | JavaScript runtime |
| **Socket.IO** | ^4.8.3 | Real-time bidirectional communication |
| **MongoDB** | - | NoSQL database for data persistence |
| **Mongoose** | ^9.6.1 | MongoDB object modeling |
| **JSON Web Tokens** | ^9.0.3 | Secure authentication |
| **bcryptjs** | ^3.0.3 | Password hashing and comparison |
| **Cloudinary** | ^2.2.0 | Cloud-based image management |
| **Multer** | ^2.1.1 | Multipart file upload handling |
| **Dotenv** | ^17.4.2 | Environment variable management |
| **CORS** | ^2.8.6 | Cross-Origin Resource Sharing |
| **Cookie Parser** | ^1.4.7 | Cookie parsing middleware |
| **Redis** | ^5.12.1 | Optional caching layer |
| **Nodemon** | ^3.1.14 | Development auto-restart utility |

---

## 📁 Project Structure

```
slack-clone-group-project-1/
├── backend/
│   ├── apis/
│   │   ├── auth.routes.js          # Authentication endpoints
│   │   ├── user.routes.js          # User management endpoints
│   │   └── chat.routes.js          # Chat and channel endpoints
│   ├── middlewares/
│   │   └── auth.middleware.js      # JWT authentication middleware
│   ├── models/
│   │   ├── User.js                 # User data model
│   │   ├── Chat.js                 # Chat/Channel model
│   │   └── Message.js              # Message model
│   ├── sockets/
│   │   └── index.js                # Socket.IO event handlers
│   ├── uploads/                    # Local file storage directory
│   ├── server.js                   # Main server entry point
│   ├── package.json                # Backend dependencies
│   └── .env                        # Environment configuration
│
├── frontend/
│   ├── src/
│   │   ├── components/             # Reusable React components
│   │   ├── pages/                  # Page components (routes)
│   │   ├── hooks/                  # Custom React hooks
│   │   ├── stores/                 # Zustand state stores
│   │   ├── utils/                  # Utility functions
│   │   ├── App.jsx                 # Root App component
│   │   ├── main.jsx                # Entry point
│   │   └── index.css               # Global styles
│   ├── public/                     # Static assets
│   ├── vite.config.js              # Vite configuration
│   ├── package.json                # Frontend dependencies
│   └── .env                        # Frontend environment config
│
├── .gitignore                      # Git ignore rules
└── README.md                       # This file
```

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18.0.0 or higher) - [Download](https://nodejs.org/)
- **npm** (v9.0.0 or higher) - Comes with Node.js
- **MongoDB** (v5.0 or higher) - [Download](https://www.mongodb.com/try/download/community) or use MongoDB Atlas
- **Git** - [Download](https://git-scm.com/)
- **Text Editor/IDE** - VS Code, WebStorm, etc.

### Optional
- **Redis** (v6.0 or higher) - For optional caching layer
- **Cloudinary Account** - For image storage (free tier available)
- **Postman** - For API testing

---

## 🚀 Installation & Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/Akhileshvankayala/slack-clone-group-project-1.git
cd slack-clone-group-project-1
```

### Step 2: Backend Setup

#### 2.1 Navigate to Backend Directory
```bash
cd backend
```

#### 2.2 Install Dependencies
```bash
npm install
```

#### 2.3 Create Environment File
Create a `.env` file in the `backend/` directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
DB_URL=mongodb://localhost:27017/slack-clone
# OR for MongoDB Atlas
# DB_URL=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# Cloudinary Configuration (optional, for image uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Redis Configuration (optional)
USE_REDIS=false
# REDIS_URL=redis://localhost:6379

# CORS Origins
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
```

### Step 3: Frontend Setup

#### 3.1 Navigate to Frontend Directory
```bash
cd frontend
```

#### 3.2 Install Dependencies
```bash
npm install
```

#### 3.3 Create Environment File
Create a `.env` file in the `frontend/` directory:

```env
# API Configuration
VITE_API_URL=http://localhost:5000/api

# Socket.IO Configuration
VITE_SOCKET_URL=http://localhost:5000
```

---

## ⚙️ Configuration

### Backend Configuration Details

#### Database Setup

**Option 1: Local MongoDB**
```bash
# Install MongoDB Community Edition
# macOS (Homebrew)
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# Verify connection
mongosh mongodb://localhost:27017
```

**Option 2: MongoDB Atlas (Cloud)**
1. Visit [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a new cluster
4. Get your connection string
5. Add to `.env`: `DB_URL=mongodb+srv://...`

#### Cloudinary Setup (Optional)
1. Create account at [Cloudinary](https://cloudinary.com/)
2. Get API credentials from dashboard
3. Add to `.env`

### Frontend Configuration Details

The frontend uses Vite for fast development and builds. Configuration is in `vite.config.js`:

```javascript
// Environment variables are accessed as VITE_*
const apiUrl = import.meta.env.VITE_API_URL
const socketUrl = import.meta.env.VITE_SOCKET_URL
```

---

## ▶️ Running the Application

### Development Mode

#### Terminal 1: Start Backend Server
```bash
cd backend
npm run dev
```

Expected output:
```
[nodemon] starting `node server.js`
Database connected successfully
Server running on port 5000
```

#### Terminal 2: Start Frontend Dev Server
```bash
cd frontend
npm run dev
```

Expected output:
```
VITE v8.0.10  ready in XXX ms

➜  Local:   http://localhost:5173/
```

### Open in Browser
Navigate to `http://localhost:5173` to access the application.

### Production Build

#### Backend
```bash
cd backend
npm start  # requires production config
```

#### Frontend
```bash
cd frontend
npm run build   # Creates optimized build in dist/
npm run preview # Preview production build locally
```

---

## 📡 API Endpoints

### Authentication Endpoints (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|----------------|
| POST | `/register` | Register new user | ❌ No |
| POST | `/login` | Login user and receive JWT | ❌ No |
| POST | `/logout` | Logout user | ✅ Yes |
| GET | `/me` | Get current user profile | ✅ Yes |
| POST | `/refresh` | Refresh JWT token | ❌ No |

**Register Request:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "avatar": "https://avatar-url.com/avatar.jpg"
}
```

**Login Request:**
```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

### User Endpoints (`/api/users`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|----------------|
| GET | `/` | Get all users | ✅ Yes |
| GET | `/:id` | Get specific user profile | ✅ Yes |
| PUT | `/:id` | Update user profile | ✅ Yes |
| DELETE | `/:id` | Delete user account | ✅ Yes |
| GET | `/search/:query` | Search users | ✅ Yes |

### Chat Endpoints (`/api/chats`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|----------------|
| POST | `/` | Create new chat/channel | ✅ Yes |
| GET | `/` | Get all user's chats | ✅ Yes |
| GET | `/:id` | Get specific chat details | ✅ Yes |
| PUT | `/:id` | Update chat/channel | ✅ Yes |
| DELETE | `/:id` | Delete chat/channel | ✅ Yes |
| POST | `/:id/members` | Add member to chat | ✅ Yes |
| DELETE | `/:id/members/:userId` | Remove member from chat | ✅ Yes |
| GET | `/:id/messages` | Get chat messages | ✅ Yes |

---

## 🔌 Socket Events

### Client → Server Events

#### Connection
- `connection` - Initial WebSocket connection
- `disconnect` - Client disconnection

#### Presence
- `user-online` - Emit when user goes online
- `user-offline` - Emit when user goes offline
- `typing` - Emit when user starts typing

#### Messaging
- `send-message` - Send message to chat
  ```javascript
  {
    chatId: "...",
    senderId: "...",
    content: "message text",
    timestamp: Date
  }
  ```
- `delete-message` - Delete a message
- `edit-message` - Edit existing message

#### Calls (Future)
- `start-call` - Initiate voice/video call
- `end-call` - End active call

### Server → Client Events

#### Presence
- `users-online` - List of online users
- `user-joined` - User came online
- `user-left` - User went offline
- `user-typing` - User is typing

#### Messaging
- `new-message` - Receive new message
- `message-deleted` - Message was deleted
- `message-edited` - Message was edited
- `message-reaction` - User reacted to message

#### Notifications
- `notification` - Generic notification
- `mention` - User mentioned you

---

## 🗄️ Database Schema

### User Model
```javascript
{
  _id: ObjectId,
  username: String (unique),
  email: String (unique),
  password: String (hashed with bcrypt),
  avatar: String (image URL),
  status: String (enum: "online", "offline", "away"),
  chats: [ObjectId], // References to Chat documents
  createdAt: Date,
  updatedAt: Date,
  lastSeen: Date
}
```

### Chat Model
```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  type: String (enum: "direct", "channel"),
  members: [ObjectId], // User references
  createdBy: ObjectId, // User reference
  avatar: String,
  isPrivate: Boolean,
  messages: [ObjectId], // Message references
  pinnedMessages: [ObjectId],
  createdAt: Date,
  updatedAt: Date
}
```

### Message Model
```javascript
{
  _id: ObjectId,
  chatId: ObjectId, // Chat reference
  senderId: ObjectId, // User reference
  content: String,
  attachments: [
    {
      type: String,
      url: String,
      name: String
    }
  ],
  reactions: Map<String, [ObjectId]>, // emoji -> users
  isPinned: Boolean,
  isEdited: Boolean,
  editedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

---

## ����️ Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENT SIDE                         │
│  React App (Vite) + Zustand State Management            │
│  - Components, Pages, Custom Hooks                      │
│  - Tailwind CSS Styling                                 │
└──────────────────┬──────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
   HTTP Requests      WebSocket Connection
   (Axios)            (Socket.IO)
        │                     │
┌───────▼─────────────────────▼─────────────┐
│        SERVER SIDE (Express.js)           │
│                                           │
│  ┌─────────────────────────────────────┐ │
│  │   Routes & Middleware               │ │
│  │  - Auth Routes                      │ │
│  │  - User Routes                      │ │
│  │  - Chat Routes                      │ │
│  │  - Error Handling                   │ │
│  └─────────────────────────────────────┘ │
│                                           │
│  ┌─────────────────────────────────────┐ │
│  │   Socket.IO Event Handlers          │ │
│  │  - Real-time Messaging              │ │
│  │  - Presence Management              │ │
│  │  - Notifications                    │ │
│  └─────────────────────────────────────┘ │
└───────┬──────────────────┬────────────────┘
        │                  │
    ┌───▼──────┐      ┌────▼──────────┐
    │ MongoDB  │      │  Cloudinary   │
    │ Database │      │  (File Upload)│
    └──────────┘      └───────────────┘
```

### Request Flow Example (Sending a Message)

1. **User Action**: User types message and hits send
2. **Frontend**: React component collects input
3. **Socket Event**: Socket.IO emits `send-message` with data
4. **Backend Listener**: Socket handler receives event
5. **Database**: Message saved to MongoDB
6. **Broadcast**: Server broadcasts `new-message` to all chat members
7. **UI Update**: Connected clients receive event and update UI
8. **Real-time**: Changes appear instantly across all connected clients

---

## 🔧 Key Technologies & Integrations

### Socket.IO - Real-Time Communication
- **Why**: Provides reliable, cross-browser, two-way communication
- **Features**: Automatic reconnection, event-based architecture, rooms for chat grouping
- **Implementation**: Server and client setup in main files with custom event handlers

### JWT Authentication
- **How it works**: User logs in → Server generates JWT → Stored in HTTP-only cookie
- **Security**: Token verified on protected routes via middleware
- **Advantages**: Stateless, scalable, CORS-friendly

### Cloudinary Integration
- **Purpose**: Cloud-based image storage and optimization
- **Benefits**: CDN delivery, automatic optimization, no server storage needed
- **Alternative**: Can use local file uploads with Multer

### Zustand State Management
- **Lightweight**: Minimal boilerplate compared to Redux
- **Easy to use**: Hooks-based API
- **Scalable**: Good for small to medium projects
- **Implementation**: Separate stores for auth, chat, user data

### Tailwind CSS
- **Utility-first**: Build designs without leaving HTML
- **Responsive**: Mobile-first responsive design utilities
- **Customizable**: Extend with custom colors, spacing, etc.
- **Bundle size**: Automatically purges unused styles in production

---

## 💻 Development Workflow

### Git Workflow (Recommended)

```bash
# Create feature branch
git checkout -b feature/feature-name

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push to remote
git push origin feature/feature-name

# Create Pull Request on GitHub
```

### Code Standards

#### Backend (Node.js)
- Use ES6+ module syntax (`import`/`export`)
- Follow REST API conventions
- Error handling with try-catch and middleware
- Input validation before database operations
- Separation of concerns (routes, models, controllers)

#### Frontend (React)
- Functional components with hooks
- Component naming: PascalCase
- File naming: lowercase with hyphens (optional), index.jsx for components
- Props validation with TypeScript or PropTypes
- Custom hooks for reusable logic

### Running Tests
```bash
# Backend tests (when added)
cd backend
npm test

# Frontend tests (when added)
cd frontend
npm test
```

### Linting & Formatting
```bash
# Frontend ESLint
cd frontend
npm run lint
```

---

## 🐛 Troubleshooting

### Common Issues & Solutions

#### **Issue: "Cannot find module" errors**
```bash
# Solution: Reinstall dependencies
rm -rf node_modules
npm install
```

#### **Issue: MongoDB Connection Failed**
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solutions:**
- Ensure MongoDB is running: `brew services start mongodb-community` (macOS)
- Check MongoDB URI in `.env` is correct
- Verify network access in MongoDB Atlas if using cloud

#### **Issue: CORS errors when frontend calls backend**
```
Access to XMLHttpRequest blocked by CORS policy
```
**Solutions:**
- Check `ALLOWED_ORIGINS` in backend `.env`
- Ensure frontend URL is whitelisted in CORS config
- Verify `credentials: true` in CORS options

#### **Issue: Socket.IO not connecting**
```
WebSocket connection failed
```
**Solutions:**
- Ensure backend is running on correct port
- Check `VITE_SOCKET_URL` matches backend URL
- Verify firewall allows WebSocket connections
- Check browser console for specific error

#### **Issue: Images not uploading to Cloudinary**
**Solutions:**
- Verify Cloudinary credentials in `.env`
- Check file size doesn't exceed limits
- Ensure file type is supported (jpg, png, gif, etc.)
- Verify API key and secret are correct

#### **Issue: Frontend shows old code after changes**
```bash
# Clear cache and rebuild
cd frontend
rm -rf dist node_modules/.vite
npm run dev
```

### Debug Mode

Enable detailed logging:
```javascript
// Backend
// Add to server.js
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.body)
  next()
})

// Frontend
// Add to main.jsx
import.meta.env.DEV && console.log('Development mode')
```

---

## 🚀 Future Enhancements

### Planned Features

#### 🎥 Video/Voice Calling
- Integrate WebRTC for peer-to-peer calls
- Screen sharing capability
- Meeting recordings

#### 📌 Advanced Messaging Features
- Message reactions (emoji)
- Message threading/replies
- Message search across chats
- Scheduled messages
- Rich text editing with mentions

#### 🔒 Security Enhancements
- Two-factor authentication (2FA)
- End-to-end encryption (E2E)
- Rate limiting on API endpoints
- CSRF protection
- Security headers (helmet.js)

#### 👥 Social Features
- User profiles with activity timeline
- Presence badges and status messages
- User verification/roles system
- Block user functionality
- Friend/follow system

#### 📊 Productivity Features
- Task/todo integration
- Reminders and notifications
- Chat search and filters
- Chat archiving
- Bulk user import

#### ⚡ Performance Optimizations
- Redis caching layer implementation
- Database query optimization
- Image lazy loading
- Code splitting and route-based loading
- Service worker for offline support

#### 📱 Mobile Support
- Mobile-responsive design improvements
- Progressive Web App (PWA) features
- Mobile app with React Native

---

## 📝 License

This project is licensed under the ISC License - see the LICENSE file for details.

---

## 👥 Contributors

This is a group project. Contributors are listed in the GitHub repository.

- Repository: [Akhileshvankayala/slack-clone-group-project-1](https://github.com/Akhileshvankayala/slack-clone-group-project-1)

---

## 📞 Support & Contact

For issues, questions, or suggestions:
1. Check existing [GitHub Issues](https://github.com/Akhileshvankayala/slack-clone-group-project-1/issues)
2. Create a new issue with detailed description
3. Contact project maintainers

---

## 📚 Additional Resources

### Documentation
- [Socket.IO Documentation](https://socket.io/docs/)
- [Express.js Guide](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [MongoDB Manual](https://docs.mongodb.com/manual/)
- [Mongoose Documentation](https://mongoosejs.com/)

### Tutorials & Guides
- [JWT Authentication](https://jwt.io/introduction)
- [CORS Explained](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [RESTful API Best Practices](https://restfulapi.net/)
- [WebSocket Communication](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

### Tools & Services
- [Postman](https://www.postman.com/) - API testing
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) - Cloud database
- [Cloudinary](https://cloudinary.com/) - Image management
- [GitHub](https://github.com/) - Version control

---

## 🎓 Learning Outcomes

By working on this project, you will learn:

✅ Full-stack web application development  
✅ RESTful API design and implementation  
✅ Real-time communication with WebSockets  
✅ User authentication and authorization  
✅ Database design and management  
✅ React component architecture  
✅ State management strategies  
✅ CSS frameworks (Tailwind)  
✅ Version control (Git/GitHub)  
✅ DevOps basics (environment config, deployment)  
✅ Security best practices  
✅ Debugging and troubleshooting  

---

## 🔄 Changelog

### Version 1.0.0 (Current)
- ✅ User authentication system
- ✅ Real-time messaging with Socket.IO
- ✅ Channel and DM support
- ✅ File upload integration
- ✅ User presence tracking
- ✅ Message management
- ✅ Responsive UI with Tailwind CSS

---

**Last Updated:** May 2026  
**Status:** 🟢 Active Development

---

*Built with ❤️ as an educational group project*

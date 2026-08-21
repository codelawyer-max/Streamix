# 🎬 Streamix

**Streamix** is a full-stack video streaming platform inspired by modern video-sharing applications. It provides video uploading and playback, user authentication, channels, social interactions, premium content, downloads, and a real-time Watch Party experience with video calling and chat.

Built as a hands-on full-stack project to explore modern web development, real-time communication, authentication, media handling, and cloud deployment.

---

## 🌐 Live Demo

**Frontend:**
https://streamix-alpha.vercel.app/

**Backend:**
https://streamix-fau0.onrender.com/

**GitHub:**
https://github.com/codelawyer-max/Streamix

---

## ✨ Features

### 🎥 Video Platform

* Video upload and streaming
* Custom video player
* Video seeking and playback controls
* Video metadata and descriptions
* View tracking
* Related videos
* Search functionality
* Responsive video grid
* Video preview thumbnails

### 👤 Authentication & Profiles

* Google authentication
* User profile management
* Channel creation
* Personal channel page
* User-specific content and interactions

### ❤️ User Interactions

* Like videos
* Watch Later
* Watch History
* Comments
* Comment management
* Search videos and content

### 💳 Premium Content

* Multiple subscription tiers
* Free, Bronze, Silver and Gold plans
* Plan-based video access
* Premium video restrictions
* Subscription upgrade flow

### 📥 Video Downloads

* Download functionality for videos
* Download tracking
* Dedicated downloads page
* Backend download handling

### 🎉 Watch Party

Streamix includes a real-time Watch Party system that allows users to watch videos together.

Features include:

* Create a Watch Party room
* Share synchronized video playback
* Real-time play/pause synchronization
* Video seeking synchronization
* Participant tracking
* Real-time chat
* Camera communication
* Screen sharing
* Mute/unmute controls
* Camera controls
* Leave-call functionality

The Watch Party functionality uses **Socket.IO** for real-time events and **WebRTC** for peer-to-peer video communication.

### 🌓 UI & Experience

* Responsive design
* Light and dark mode
* Mobile-friendly layouts
* Modern card-based interface
* Responsive navigation
* Interactive loading and empty states
* Hover and transition effects

---

## 🛠️ Tech Stack

### Frontend

* **Next.js**
* **React**
* **TypeScript**
* **Tailwind CSS**
* **Lucide React**
* **Axios**
* **Socket.IO Client**
* **WebRTC**

### Backend

* **Node.js**
* **Express.js**
* **MongoDB**
* **Mongoose**
* **Socket.IO**

### Authentication

* Google Authentication
* Firebase authentication integration

### Deployment

* **Frontend:** Vercel
* **Backend:** Render
* **Database:** MongoDB Atlas

---

## 🏗️ Architecture

Streamix follows a client-server architecture:

```text
                    ┌─────────────────────┐
                    │      Streamix       │
                    │     Frontend        │
                    │     Next.js         │
                    └──────────┬──────────┘
                               │
                    HTTP / REST API
                               │
                               ▼
                    ┌─────────────────────┐
                    │       Express       │
                    │       Backend       │
                    │      Node.js        │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
                    ▼                     ▼
             ┌─────────────┐       ┌─────────────┐
             │  MongoDB    │       │   Socket.IO │
             │    Atlas    │       │ Real-time   │
             └─────────────┘       └──────┬──────┘
                                          │
                                          ▼
                                   Watch Party
                                   Communication
                                          │
                                          ▼
                                       WebRTC
```

---

## 📂 Project Structure

```text
PlayTube/
│
├── server/
│   ├── controllers/
│   │   ├── download.js
│   │   └── video.js
│   │
│   ├── modals/
│   │   └── download.js
│   │
│   ├── routes/
│   │   └── download.js
│   │
│   ├── index.js
│   ├── package.json
│   └── ...
│
└── streamix/
    ├── src/
    │   ├── components/
    │   │   └── ui/
    │   │
    │   ├── lib/
    │   │   ├── AuthContext
    │   │   ├── AxiosInstance
    │   │   ├── ThemeContext
    │   │   └── socket.tsx
    │   │
    │   └── pages/
    │       ├── downloads.tsx
    │       ├── watch/
    │       ├── watch-party/
    │       └── ...
    │
    ├── package.json
    └── ...
```

---

## 🚀 Getting Started

### Prerequisites

Make sure you have installed:

* Node.js
* npm
* MongoDB Atlas account
* Firebase project for Google authentication

---

### 1. Clone the repository

```bash
git clone https://github.com/codelawyer-max/Streamix.git
cd Streamix
```

---

### 2. Install backend dependencies

```bash
cd server
npm install
```

---

### 3. Install frontend dependencies

Open another terminal:

```bash
cd streamix
npm install
```

---

### 4. Configure environment variables

Create the required environment files for the frontend and backend.

Example frontend configuration:

```env
NEXT_PUBLIC_BACKEND_URL=your_backend_url
```

Add your backend configuration separately, including your MongoDB connection and authentication-related credentials.

> Do not commit `.env` or other secret configuration files to GitHub.

---

### 5. Start the backend

From the `server` directory:

```bash
npm start
```

---

### 6. Start the frontend

From the `streamix` directory:

```bash
npm run dev
```

The application should then be available at:

```text
http://localhost:3000
```

---

## 🔄 Real-Time Watch Party

One of the major features of Streamix is the Watch Party system.

The basic flow is:

```text
User creates Watch Party
          ↓
Room ID generated
          ↓
Participant joins room
          ↓
Socket.IO establishes real-time communication
          ↓
Video events are synchronized
          ↓
WebRTC establishes peer-to-peer media
          ↓
Participants can communicate
          ↓
Real-time chat runs through Socket.IO
```

This allows participants to:

* Watch the same video
* Synchronize playback
* Communicate through chat
* Share camera/video
* Share their screen
* Control microphone and camera

---

## ☁️ Deployment

### Frontend

The Next.js application is deployed using **Vercel**.

🔗 https://streamix-alpha.vercel.app/

### Backend

The Express/Node.js server is deployed using **Render**.

🔗 https://streamix-fau0.onrender.com/

### Database

MongoDB Atlas is used as the cloud database.

---

## 🔐 Security

Environment variables and sensitive credentials are excluded from version control.

The project uses environment-based configuration for:

* Database credentials
* Authentication configuration
* Backend URLs
* Other private application settings

---

## 📚 What I Learned

Building Streamix provided hands-on experience with:

* Full-stack application architecture
* Next.js and React development
* TypeScript
* REST API development
* MongoDB and Mongoose
* Authentication
* File and video handling
* Real-time communication
* Socket.IO
* WebRTC
* State management
* Responsive UI development
* Dark/light theme implementation
* Cloud deployment
* Debugging production and development issues
* Git and GitHub workflow

The Watch Party feature was particularly useful for understanding how **real-time events and peer-to-peer WebRTC communication** can work together inside a web application.

---

## 🔮 Future Improvements

Some areas that could be expanded in future versions include:

* Improved video recommendations
* Advanced creator analytics
* More robust video transcoding
* Improved notification system
* Group Watch Party support
* Improved synchronization for larger rooms
* Video quality selection
* More advanced moderation tools
* Improved accessibility
* Automated testing
* CI/CD pipeline

---

## 📸 Screenshots

Screenshots of the application can be added here to showcase:

* Home page
* Video watch page
* Channel page
* Search
* Premium subscription
* Watch Party
* Real-time chat
* Dark mode

---

## 👨‍💻 Author

**Kartik Mishra**

B.Tech Computer Science & Engineering

GitHub:
https://github.com/codelawyer-max

---

## ⭐ Project

If you found this project interesting, consider giving the repository a ⭐ on GitHub.

**Streamix — Watch. Share. Connect.**

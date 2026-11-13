# 🚀 HostelConnect

[![Vite](https://img.shields.io/badge/Vite-8A2BE2?style=for-the-badge&logo=vite&logoColor=FFD700)](https://vite.dev/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

**HostelConnect** is a premium, state-of-the-art web application designed to streamline hostel communication, meal scheduling, community feedback, and maintenance operations. Styled with a gorgeous **dark-mode glassmorphic aesthetic** featuring micro-animations, real-time WebSocket integrations, and an immersive custom canvas starfield (Constellation Background), HostelConnect makes dormitory and hostel living highly interactive, transparent, and user-friendly.

---

## ✨ Outstanding Features

### 🔐 1. Smart Authentication & Role Management
* **Dual Portal Roles**: Specialized dashboards and dashboards panels for both **Students/Residents** and **Hostel Admins**.
* **Profile Settings & Security**: Update profile pictures, passwords, registration details, and contact coordinates.
* **JWT & Bcrypt Security**: Complete JSON Web Token authorization paired with secure encryption for user credentials.

### ⚡ 2. Real-Time Chat & Direct Messaging
* **Global Resident Chatroom**: Interact instantly with everyone in the hostel.
* **🔒 Anonymous Toggle**: Send messages completely anonymously for private questions or community discussions.
* **Direct Messaging (DM)**: Chat privately with admins or peer residents.
* **Online User Directory**: Live tracking of online users, roles, and real-time desktop notification cards when a new message or DM arrives.

### 📋 3. Intelligent Complaint System
* **Automated Smart Heuristics**: Automatically determines priority levels (`High`, `Medium`, or `Low`) by scanning complaint descriptions for key phrases (e.g., "leak", "fire", "wifi").
* **Community Upvoting**: Students can upvote active issues to alert admins to major problems.
* **Live Ticket Tracking**: Real-time status changes (`Pending` ➡️ `In Progress` ➡️ `Resolved`) synchronized instantly via WebSockets with admin remarks.

### 🍽 4. Digital Mess & Meal Dashboard
* **Dynamic Mess Menu**: An elegant weekly grid detailing Breakfast, Lunch, Snacks, and Dinner.
* **Meal Feedback Pipeline**: Residents submit real-time 1-5 star ratings and reviews for individual daily meals.
* **Admin Analytics Grid**: Aggregated satisfaction statistics, averages, and detailed student comments are computed automatically for the admin panel.

### 📢 5. Community Forum & Announcement Board
* **Hosteller Forum**: Share notices, buy/sell updates, lost-and-found posts, and local announcements.
* **Likes & Comments**: Interactive community feed allowing comments and standard post-upvoting.
* **Sticky Admin Announcements**: Priority banners for crucial official news.

---

## 🎨 Premium Visual Design System

HostelConnect is visually stunning. It is crafted with:
* **Glassmorphism**: Transparent, blurred backdrops (`backdrop-filter`) accented by subtle neon borders.
* **Interactive Starfield**: A dynamic background canvas rendering floating interactive starlight nodes and glowing constellations.
* **Curated Palettes**: Harmony-calibrated colors featuring soft neon highlights, vibrant indicators, and stateful badges.
* **Fluid Animation Elements**: Micro-animations on interactive cards, input frames, active icons, and seamless page transitions.

---

## 🏗 Project Structure

```bash
hostel-connect/
├── backend/                  # Express.js REST API & WebSocket server
│   ├── middleware/           # Route guards (Authentication & Role Verification)
│   ├── models/               # Mongoose MongoDB Schemas (User, Complaint, Post, Message, Menu)
│   ├── routes/               # API endpoints (Auth, Complaints, Mess, Messages, Posts)
│   ├── Dockerfile            # Container definition for backend
│   └── server.js             # Main server entrypoint (Socket.io & Database integration)
│
├── frontend/                 # Vite + React Single-Page Application (SPA)
│   ├── public/               # Static assets
│   ├── src/                  # Main source directory
│   │   ├── assets/           # UI media & image elements
│   │   ├── components/       # Heavy visual widgets (Chat, Complaints, MessMenu, Forums)
│   │   │   ├── ChatSystem.jsx
│   │   │   ├── CommunityFeed.jsx
│   │   │   ├── ComplaintSystem.jsx
│   │   │   ├── ConstellationBackground.jsx   # Immersive Custom Stars Canvas
│   │   │   └── MessMenu.jsx
│   │   ├── context/          # State providers (AuthContext, NotificationContext)
│   │   ├── App.css           # Layout frames and layout animations
│   │   ├── index.css         # Glassmorphic root design styles
│   │   ├── Dashboard.jsx     # Master controller for panels and tabs
│   │   └── main.jsx          # App entrypoint
│   ├── nginx.conf            # Nginx server file for production Docker builds
│   └── Dockerfile            # Container definition for frontend
│
└── docker-compose.yml        # Orchestrates MongoDB, Backend, and Frontend
```

---

## ⚙ Environment Configuration

Create a `.env` file in the root directory to orchestrate the backend and frontend:

```env
# MongoDB Connection String (Cloud URI or Local Database)
MONGO_URI=mongodb+srv://your-username:your-password@cluster.mongodb.net/hostelconnect?retryWrites=true&w=majority

# JSON Web Token Secret
JWT_SECRET=superSecretSecurityTokenKeyForJWTVerification

# API and Socket Connection Endpoints (Ensure ports match docker-compose configuration)
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

---

## 🚀 Installation & Running Locally

Ensure you have [Node.js](https://nodejs.org/) (v18 or higher), [Docker Desktop](https://www.docker.com/), and [Git](https://git-scm.com/) installed.

### Option A: Complete Docker Compose Orchestration (Recommended)

To start the database, backend services, and frontend portal automatically:

1. Clone the repository and navigate to the project directory:
   ```bash
   git clone https://github.com/vyshnavi1411/hostel-connect.git
   cd hostel-connect
   ```
2. Build and launch the containerized platform:
   ```bash
   docker compose up --build
   ```
3. Access the platform endpoints:
   - **Frontend Portal**: [http://localhost:5173](http://localhost:5173)
   - **Backend Server**: [http://localhost:5000](http://localhost:5000)
   - **MongoDB Instance**: `mongodb://localhost:27017`

---

### Option B: Step-by-Step Local Setup (Manual Mode)

#### 1. Setup the Database
Ensure your MongoDB local server is active, or use a Mongo Atlas URI in your `.env` config file.

#### 2. Install and Start Backend
```bash
cd backend
npm install
# Start server in production/active state:
npm start
```
*The backend server will run on `http://localhost:5000`.*

#### 3. Install and Start Frontend
```bash
cd ../frontend
npm install
# Start development hot-reload server:
npm run dev
```
*The Vite development server will host the client on `http://localhost:5173`.*

---

## 🧭 Navigation & Verification Checklist

To experience the full capabilities of **HostelConnect**:
1. **Landing & Registration**: Visit [http://localhost:5173/login](http://localhost:5173/login). Use the Registration link to sign up a fresh resident account.
2. **Admin Privilege**: Use the `promote-admin.js` helper tool in the backend directory to elevate a student account to an admin profile:
   ```bash
   cd backend
   node promote-admin.js user@email.com
   ```
3. **Live Messenger**: Open two separate browser tabs (one in incognito). Log in as different residents, toggle the `Anonymous` checkbox, and test the real-time websocket chat or Direct Messages.
4. **Maintenance lodging**: Create a complaint ticket containing the word `"leak"` or `"fire"`. Observe the smart heuristic automatically sorting it to `High` or `Medium` priority, and verify that the admin dashboard reflects the changes live.

---

> [!TIP]
> **HostelConnect** is designed as an ultra-immersive, high-fidelity experience. For the ultimate visual experience, use a modern chromium-based browser (Chrome, Edge) with browser hardware acceleration enabled to maximize the canvas performance!

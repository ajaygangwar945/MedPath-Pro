<img align="center" src="./banner_v2.png" width="100%" height="200" style="object-fit: cover">

<h1 align="center">🏥 MedPath Pro</h1>

<p align="center">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5" />
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
  <img src="https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=three.js&logoColor=white" alt="Three.js" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express.js" />
  <img src="https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
</p>

## Overview

MedPath Pro is a high-performance, interactive hospital shortest path visualizer. Designed with an elegant medical-themed UI and powered by Dijkstra's algorithm, it helps visualize the most efficient routes between patients and medical facilities in real-time.

---

## 🚀 View Live Site

The project is live and accessible online.

[![Live Website](https://img.shields.io/badge/Live_Website-2EA44F?style=for-the-badge&logo=vercel&logoColor=white)](https://medpath-pro.onrender.com/)

---

## 🌟 Key Features

### 🗺️ Visualizer Map

- 🖱️ **Interactive Graph Creation**: Easily add Users (Patients), Hospitals, and weighted edges by clicking on the workspace.
- 📐 **Dynamic Edge Weighting**: Distances are automatically calculated using Euclidean geometry.
- ⚡ **Real-time Pathfinding**: Implements Dijkstra's algorithm to calculate the shortest path from any source node to all other reachable nodes.
- 📊 **Demo Data**: One-click demo initialization to populate the map with complex scenarios.

### 🚑 Emergency System

- 🔔 **Emergency Notifications**: Integrated alerting system where patients can notify hospitals, and hospitals can approve requests.
- 🌊 **Path Animation**: Approved paths are visually animated with flowing dashed lines on the canvas.
- 🛏️ **Resource Tracking**: Bed counts decrease automatically upon request approval.

### 🔐 Admin Dashboard & Hospital Portal

- 🏥 **Hospital Management**: Dedicated dashboards for hospitals to manage bed availability and incoming emergency notifications.
- 🛡️ **Role-Based Access**: Secure login with JWT authentication.
- ⚙️ **Node Management**: Approve/Unapprove patients and edit hospital resources directly.
- 📈 **Global Stats**: Track total users, hospitals, and pending emergency requests in real-time.

### 🌌 Immersive UI

- 🌐 **Dynamic 3D Environment**: Features an immersive 3D background built with Three.js, simulating a neural/medical network.
- 🔀 **Simulated Mission Control**: Seamlessly toggle between "Mission Control" and "Tactical Map".

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, Vanilla CSS3 (Custom Properties, Glassmorphism), ES6+ JavaScript
- **Graphics Graphics**: Canvas API (2D Graph rendering), Three.js (3D Animated background)
- **Backend**: Node.js, Express.js
- **Database**: MongoDB Atlas (Mongoose)
- **Auth & Security**: JWT (JSON Web Tokens), Bcryptjs (12 Salt Rounds), Helmet.js (Security Headers), and Express-Rate-Limit (Brute-force protection)
- **Assets**: Font Awesome 6 (Icons), Inter (Google Fonts)

---

## 📂 Project Structure

```bash
├── server/             # Express.js Backend
│   ├── middleware/    # Auth Guards (JWT verification)
│   ├── models/        # Mongoose Schemas (Admin, Node, Edge, Notification)
│   ├── routes/        # RESTful API Endpoints (Auth, Nodes, Edges, Notifs)
│   ├── public/        # Optimized Frontend (Static Assets)
│   │   ├── assets/    # High-res clinical visuals & icons
│   │   ├── index.html # Immersive Landing Page (Three.js)
│   │   ├── app.html   # Main Interactive Map Visualizer
│   │   ├── admin.html # Secure Administrative Control Panel
│   │   ├── script.js  # Core Client Logic (Dijkstra implementation)
│   │   ├── admin.js   # Dashboard Lifecycle & Request Management
│   │   └── style.css  # Global Glassmorphism & Responsive Design
│   └── index.js       # Server Entry Point & Multi-Model Seeding
├── MedPath-Pro-Analysis.txt # Complete DSA & Architectural Analysis
└── render.yaml        # Infrastructure as Code (Render Cloud)
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: Version 18.0.0 or higher.
- **MongoDB**: A running MongoDB instance (local or Atlas).

### Quick Start

1. **Install Dependencies**:

   ```bash
   cd server
   npm install
   ```

2. **Setup Environment**:
   Create a `.env` file in the `server/` directory:

   ```env
   MONGO_URI=your_mongodb_uri
   JWT_SECRET=your_secret_key
   ADMIN_EMAIL=admin@medpath.pro
   ADMIN_PASSWORD=your_password
   EMAIL_USER=your_gmail@gmail.com
   EMAIL_PASS=your_gmail_app_password
   ```

3. **Run Locally**:

   ```bash
   npm run dev
   ```

   *Access the application at <http://localhost:5000>*

---

## ☁️ Deployment

This project was developed for and deployed as a **Web Service** on **Render**. Follow these steps to deploy:

1. Push your code to GitHub.
2. Go to your Render Dashboard.
3. Select **New > Web Service**.
4. Connect this GitHub repository.
5. Set the **Build Command** to: `npm install --prefix server`
6. Set the **Start Command** to: `node server/index.js`
7. Add the necessary Environment Variables (matching your `.env` file).
8. Click **Create Web Service** and Render will handle the rest!

---

<div align="center">
  Developed by <b>Ajay Gangwar</b><br>
  <i>Developed with ❤️ for efficient healthcare logistics.</i>
</div>

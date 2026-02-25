# 🏥 MedPath Pro

<p align="left">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5" />
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
  <img src="https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=three.js&logoColor=white" alt="Three.js" />
  <img src="https://img.shields.io/badge/Font_Awesome-339AF0?style=for-the-badge&logo=font-awesome&logoColor=white" alt="Font Awesome" />
</p>

## 🌐 Live Demo

**Check out the live application here: [MedPath Pro Live](https://ajaygangwar945.github.io/MedPath-Pro/)**

MedPath Pro is a high-performance, interactive hospital shortest path visualizer. Designed with an elegant medical-themed UI and powered by Dijkstra's algorithm, it helps visualize the most efficient routes between patients and medical facilities in real-time.

## 🌟 Key Features

- 🖱️ **Interactive Graph Canvas**: Easily add Users (Patients), Hospitals, and weighted edges by clicking on the workspace.
- ⚡ **Real-time Pathfinding**: Implements Dijkstra's algorithm to calculate the shortest path from any source node to all other reachable nodes.
- 🏥 **Hospital Management Portal**: Dedicated dashboards for hospitals to manage bed availability and handle incoming emergency notifications.
- 🌐 **Dynamic 3D Environment**: Features an immersive 3D background built with Three.js, simulating a neural/medical network.
- 🔔 **Emergency Notifications**: Integrated alerting system where patients can notify hospitals, and hospitals can approve requests.
- 📊 **Demo Data**: One-click demo initialization to populate the map with complex scenarios.

## 🛠️ Tech Stack

- **Structure**: Semantic HTML5
- **Styling**: Vanilla CSS3 (Custom Properties, Glassmorphism)
- **Logic**: ES6+ JavaScript
- **Graphics**:
  - **2D**: Canvas API (Graph rendering)
  - **3D**: Three.js (Animated background)
- **Icons**: Font Awesome 6
- **Typography**: Inter (Google Fonts)

## 🚀 Getting Started

### Prerequisites

- **Node.js**: Version 18.0.0 or higher.
- **MongoDB**: A running MongoDB instance (local or Atlas).

---

## 🚀 Key Features

### 🗺️ Visualizer Map

- **Interactive Graph creation**: Add patients (User nodes) and hospitals with simple clicks.
- **Dynamic Edge Weighting**: Distances are automatically calculated using Euclidean geometry.
- **Dijkstra Real-time Calculation**: Instant pathfinding from any source node to all reachable hospitals.

### 🔐 Admin Dashboard (Mission Control)

- **Role-Based Access**: Secure login with JWT authentication.
- **Node Management**: Approve/Unapprove patients and edit hospital resources (beds) directly.
- **Global Stats**: Track total users, hospitals, and pending emergency requests in real-time.
- **One-Click Navigation**: Seamlessly toggle between "Mission Control" and "Tactical Map".

### 🚑 Emergency System

- **Real-Time Notifications**: Patients can notify hospitals of emergencies.
- **Path Animation**: Approved paths are visually animated with flowing dashed lines on the canvas.
- **Resource Tracking**: Bed counts decrease automatically upon request approval.

---

## 🛠️ Technical Stack

- **Frontend**: Vanilla JS (ES6+), HTML5 Canvas, CSS3 (Glassmorphism)
- **Backend**: Node.js, Express.js
- **Database**: MongoDB Atlas (Mongoose)
- **Auth**: JWT (JSON Web Tokens) & Bcryptjs
- **Icons & Fonts**: Font Awesome 6, Inter (Google Fonts)

---

## 📂 Project Structure

```bash
├── server/             # Express.js Backend
│   ├── models/        # Mongoose Schemas (Admin, Node, Edge, Notification)
│   ├── routes/        # API Endpoints (Auth, Nodes, Edges, Notifications)
│   ├── public/        # Main Frontend (Served by Express)
│   └── index.js       # Server Entry & Auto-Seeding Logic
├── MedPath_Pro_Analysis.txt # Detailed DSA Technical Analysis
└── render.yaml        # Render Deployment Configuration
```

---

## 🏁 Quick Start

1. **Install Dependencies**:

   ```bash
   npm install --prefix server
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

   *Access at <http://localhost:5000>*

---

## 🧠 DSA Analysis

For a deep dive into the algorithms and data structures (Graphs, Dijkstra, euclidean distance) used in this project, refer to the [MedPath_Pro_Analysis.txt](./MedPath_Pro_Analysis.txt) file.

---

<div align="center">
  Developed by <b>Ajay Gangwar</b>
</div>

## ☁️ Deployment

This project is ready for deployment on **Render** using Blueprint:

1. Push your code to GitHub.
2. Go to Render Dashboard.
3. Select **New > Blueprint**.
4. Connect this repository and follow the prompts.

---
Developed with ❤️ for efficient healthcare logistics.

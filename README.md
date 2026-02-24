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

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/ajaygangwar945/MedPath-Pro.git
   cd MedPath-Pro
   ```

2. Install dependencies:

   ```bash
   cd server
   npm install
   ```

3. Configure environment variables:
   Create a `.env` file in the `server/` directory with:

   ```env
   MONGO_URI=your_mongodb_uri
   JWT_SECRET=your_jwt_secret
   PORT=5000
   ```

4. Run the application:

   ```bash
   # From the root directory
   npm start
   ```

## 📂 Project Structure

- 📂 `server/`: Backend Node.js/Express server logic and models.
  - 📂 `public/`: Frontend static files (the core visualizer).
- 📄 `index.html`: (Legacy/Development) Shortcut to frontend.
- 📄 `render.yaml`: Configuration for Render deployment.

## ☁️ Deployment

This project is ready for deployment on **Render** using Blueprint:

1. Push your code to GitHub.
2. Go to Render Dashboard.
3. Select **New > Blueprint**.
4. Connect this repository and follow the prompts.

---
Developed with ❤️ for efficient healthcare logistics.

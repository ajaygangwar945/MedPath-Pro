# 🏥 MedPath Pro

MedPath Pro is a high-performance, interactive hospital shortest path visualizer. Designed with an elegant medical-themed UI and powered by Dijkstra's algorithm, it helps visualize the most efficient routes between patients and medical facilities in real-time.

<p align="center">
  <img src="https://img.shields.io/github/languages/top/ajaygangwar945/MedPath-Pro?style=for-the-badge&color=14b8a6" alt="Top Language" />
  <img src="https://img.shields.io/github/languages/count/ajaygangwar945/MedPath-Pro?style=for-the-badge&color=14b8a6" alt="Languages Count" />
  <img src="https://img.shields.io/github/repo-size/ajaygangwar945/MedPath-Pro?style=for-the-badge&color=14b8a6" alt="Repo Size" />
  <img src="https://img.shields.io/github/stars/ajaygangwar945/MedPath-Pro?style=for-the-badge&color=14b8a6" alt="Stars" />
  <img src="https://img.shields.io/github/forks/ajaygangwar945/MedPath-Pro?style=for-the-badge&color=14b8a6" alt="Forks" />
  <img src="https://img.shields.io/github/license/ajaygangwar945/MedPath-Pro?style=for-the-badge&color=14b8a6" alt="License" />
</p>

## 🌟 Key Features

- 🖱️ **Interactive Graph Canvas**: Easily add Users (Patients), Hospitals, and weighted edges by clicking on the workspace.
- ⚡ **Real-time Pathfinding**: Implements Dijkstra's algorithm to calculate the shortest path from any source node to all other reachable nodes.
- 🏥 **Hospital Management Portal**: Dedicated dashboards for hospitals to manage bed availability and handle incoming emergency notifications.
- 🌐 **Dynamic 3D Environment**: Features an immersive 3D background built with Three.js, simulating a neural/medical network.
- 🔔 **Emergency Notifications**: Integrated alerting system where patients can notify hospitals, and hospitals can approve requests.
- 📊 **Demo Data**: One-click demo initialization to populate the map with complex scenarios.

## 🛠️ Tech Stack

<p align="left">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5" />
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
  <img src="https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=three.js&logoColor=white" alt="Three.js" />
  <img src="https://img.shields.io/badge/Font_Awesome-339AF0?style=for-the-badge&logo=font-awesome&logoColor=white" alt="Font Awesome" />
</p>

- **Structure**: Semantic HTML5
- **Styling**: Vanilla CSS3 (Custom Properties, Glassmorphism)
- **Logic**: ES6+ JavaScript
- **Graphics**:
  - **2D**: Canvas API (Graph rendering)
  - **3D**: Three.js (Animated background)
- **Icons**: Font Awesome 6
- **Typography**: Inter (Google Fonts)

## 🚀 Getting Started

### Installation

No installation is required. Simply clone the repository and open `index.html` in any modern web browser.

```bash
git clone https://github.com/ajaygangwar945/MedPath-Pro.git
cd MedPath-Pro
```

### How to Use

1. 👤 **Add Nodes**: Select "Add User" or "Add Hospital" from the toolbar and click anywhere on the canvas.
2. 🔗 **Connect Points**: Select "Add Edges", click a source node, then click a destination node to create a weighted path.
3. 🏁 **Calculate Paths**: Enter the ID of your source node in the "Source ID" input and click **Run Dijkstra**.
4. 🏥 **Notify Hospitals**: Once paths are calculated, click "Notify Hospital" in the sidebar to send an emergency request.
5. 🔑 **Portal Access**: Click on any Hospital node to open its management portal.

## 📂 Project Structure

- 📄 `index.html`: Main application interface and structure.
- 🎨 `style.css`: Comprehensive styling, including animations, glassmorphism, and responsive layouts.
- ⚙️ `script.js`: Core application logic, graph management, algorithm implementation, and 3D background initialization.

---
Developed with ❤️ for efficient healthcare logistics.

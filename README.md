# MedPath Pro 🏥

MedPath Pro is a high-performance, interactive hospital shortest path visualizer. Designed with an elegant medical-themed UI and powered by Dijkstra's algorithm, it helps visualize the most efficient routes between patients and medical facilities in real-time.

![MedPath Pro Preview](https://via.placeholder.com/800x400?text=MedPath+Pro+Visualizer) <!-- Replace with actual screenshot if available -->

## 🌟 Key Features

- **Interactive Graph Canvas**: Easily add Users (Patients), Hospitals, and weighted edges by clicking on the workspace.
- **Real-time Pathfinding**: Implements Dijkstra's algorithm to calculate the shortest path from any source node to all other reachable nodes.
- **Hospital Management Portal**: Dedicated dashboards for hospitals to manage bed availability and handle incoming emergency notifications.
- **Dynamic 3D Environment**: Features an immersive 3D background built with Three.js, simulating a neural/medical network.
- **Emergency Notifications**: Integrated alerting system where patients can notify hospitals, and hospitals can approve requests, triggering "flow" path animations.
- **Demo Data**: One-click demo initialization to populate the map with complex scenarios.

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

### Installation

No installation is required. Simply clone the repository and open `index.html` in any modern web browser.

```bash
git clone https://github.com/your-username/MedPath-Pro.git
cd MedPath-Pro
# Open index.html in your browser
```

### How to Use

1. **Add Nodes**: Select "Add User" or "Add Hospital" from the toolbar and click anywhere on the canvas.
2. **Connect Points**: Select "Add Edges", click a source node, then click a destination node to create a weighted path.
3. **Calculate Paths**: Enter the ID of your source node in the "Source ID" input and click **Run Dijkstra**.
4. **Notify Hospitals**: Once paths are calculated, click "Notify Hospital" in the sidebar to send an emergency request.
5. **Portal Access**: Click on any Hospital node to open its management portal.

## 📂 Project Structure

- `index.html`: Main application interface and structure.
- `style.css`: Comprehensive styling, including animations, glassmorphism, and responsive layouts.
- `script.js`: Core application logic, graph management, algorithm implementation, and 3D background initialization.

---
Developed with ❤️ for efficient healthcare logistics.

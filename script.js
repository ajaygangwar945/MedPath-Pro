// ========================================
// 0. 3D BACKGROUND (THREE.JS)
// ========================================
function initThreeBackground() {
    const container = document.getElementById('three-container');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });

    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    // Create floating "Medical Nodes" in 3D
    const geometry = new THREE.SphereGeometry(0.1, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color: 0x14b8a6, transparent: true, opacity: 0.2 });

    const particles = [];
    for (let i = 0; i < 100; i++) {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(
            (Math.random() - 0.5) * 30,
            (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 10
        );
        mesh.userData.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.01,
            (Math.random() - 0.5) * 0.01,
            (Math.random() - 0.5) * 0.01
        );
        scene.add(mesh);
        particles.push(mesh);
    }

    // Add connecting lines (Neural/Medical network feel)
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x14b8a6, transparent: true, opacity: 0.05 });
    const lineCount = 50;
    for (let i = 0; i < lineCount; i++) {
        const points = [];
        points.push(new THREE.Vector3(Math.random() * 20 - 10, Math.random() * 20 - 10, Math.random() * 10 - 5));
        points.push(new THREE.Vector3(Math.random() * 20 - 10, Math.random() * 20 - 10, Math.random() * 10 - 5));
        const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(lineGeom, lineMaterial);
        scene.add(line);
    }

    camera.position.z = 12;

    function animate() {
        requestAnimationFrame(animate);
        particles.forEach(p => {
            p.position.add(p.userData.velocity);
            // Boundary check
            if (Math.abs(p.position.x) > 15) p.userData.velocity.x *= -1;
            if (Math.abs(p.position.y) > 10) p.userData.velocity.y *= -1;
        });
        renderer.render(scene, camera);
    }

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    animate();
}

initThreeBackground();

// ========================================
// 1. VISUALIZER STATE
// ========================================

const canvas = document.getElementById('graph-canvas');
const ctx = canvas.getContext('2d');
const container = document.getElementById('canvas-container');
const emptyState = document.getElementById('empty-state');
const addUserBtn = document.getElementById('addUserBtn');
const addHospitalBtn = document.getElementById('addHospitalBtn');
const addEdgeBtn = document.getElementById('addEdgeBtn');
const clearBtn = document.getElementById('clearBtn');
const runBtn = document.getElementById('runBtn');
const demoBtn = document.getElementById('demoBtn');
const sourceInput = document.getElementById('sourceNode');
const pathsList = document.getElementById('pathsList');
const infoIcon = document.querySelector('.info-icon');
const modal = document.getElementById('instructionsModal');
const closeModal = document.querySelector('.close-modal');

// Edit Modals
const editNodeModal = document.getElementById('editNodeModal');
const editHospitalModal = document.getElementById('editHospitalModal');
const editNodeName = document.getElementById('edit-node-name');
const editNodePhone = document.getElementById('edit-node-phone');
const editNodeEmail = document.getElementById('edit-node-email');
const saveNodeBtn = document.getElementById('save-node-btn');
const editHospName = document.getElementById('edit-hosp-name');
const editHospBeds = document.getElementById('edit-hosp-beds');
const saveHospBtn = document.getElementById('save-hosp-btn');

// Hospital Portal DOMs
const hospitalPortal = document.getElementById('hospital-portal');
const backToMapBtn = document.getElementById('backToMapBtn');
const portalHospName = document.getElementById('portal-hosp-name');
const portalBedsCount = document.getElementById('portal-beds-count');
const editPortalHospBtn = document.getElementById('editPortalHospBtn');
const notificationList = document.getElementById('notification-list');

let nodes = [];
let edges = [];
let notifications = []; // Global notification storage
let currentMode = 'user'; // 'user', 'hospital', 'edge'
let selectedNodeIndex = null;
let editingNodeIndex = null;
let currentlyActiveHospitalIndex = null; // Track which hospital portal is open
let shortestPaths = null;
let isAnimating = false;

// ========================================
// 1. CANVAS & CORE LOGIC
// ========================================

function resizeCanvas() {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    drawGraph();
}

/**
 * Handle canvas mouse clicks for node/edge placement
 */
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clickedIndex = findNodeAt(x, y);

    if (currentMode === 'edge') {
        if (clickedIndex !== null) {
            if (selectedNodeIndex === null) {
                selectedNodeIndex = clickedIndex;
            } else if (selectedNodeIndex !== clickedIndex) {
                const dist = calculateDistance(nodes[selectedNodeIndex], nodes[clickedIndex]);
                // Check if edge already exists
                const exists = edges.some(e =>
                    (e.from === selectedNodeIndex && e.to === clickedIndex) ||
                    (e.from === clickedIndex && e.to === selectedNodeIndex)
                );
                if (!exists) {
                    edges.push({
                        from: selectedNodeIndex,
                        to: clickedIndex,
                        weight: Math.round(dist / 10)
                    });
                }
                selectedNodeIndex = null;
            }
        }
    } else {
        if (clickedIndex !== null) {
            // Clicked an existing node
            const node = nodes[clickedIndex];
            if (node.type === 'hospital') {
                openHospitalPortal(clickedIndex);
            } else {
                openEditModal(clickedIndex);
            }
        } else {
            // Clicked empty space -> Add new node with safety margin
            const margin = 50;
            const clampedX = Math.max(margin, Math.min(canvas.width - margin, x));
            const clampedY = Math.max(margin, Math.min(canvas.height - margin, y));

            const newNode = {
                id: nodes.length,
                x: clampedX,
                y: clampedY,
                type: currentMode,
                name: currentMode === 'hospital' ? `Hospital ${nodes.length}` : `User ${nodes.length}`,
                phone: currentMode === 'user' ? '+1 234 567 890' : '',
                email: currentMode === 'user' ? 'user@example.com' : '',
                availableBeds: 20
            };
            nodes.push(newNode);
            emptyState.style.display = 'none';
        }
    }
    drawGraph();
});

function openHospitalPortal(index) {
    currentlyActiveHospitalIndex = index;
    const node = nodes[index];
    portalHospName.innerText = node.name;
    portalBedsCount.innerText = node.availableBeds;
    hospitalPortal.classList.remove('hidden');
    renderPortalNotifications();
}

function renderPortalNotifications() {
    notificationList.innerHTML = '';
    const filtered = notifications.filter(n => n.targetNodeIndex === currentlyActiveHospitalIndex);

    if (filtered.length === 0) {
        notificationList.innerHTML = '<div class="empty-hint">No incoming notifications</div>';
        return;
    }

    filtered.forEach((notif, idx) => {
        const card = document.createElement('div');
        card.className = 'notification-card';
        card.innerHTML = `
            <div class="notif-info">
                <h4>From: ${notif.userName} (ID: ${notif.sourceNodeIndex})</h4>
                ${notif.status === 'approved' ?
                `<p>Distance: <b>${notif.distance}</b> | Path: ${notif.path}</p>` :
                `<p><i>Details hidden until approval</i></p>`
            }
                <div class="status-badge ${notif.status === 'approved' ? 'status-approved' : 'status-pending'}">
                    ${notif.status}
                </div>
            </div>
            <div class="notif-actions">
                ${notif.status === 'pending' ? `<button class="btn btn-run" onclick="approveNotification(${notifications.indexOf(notif)})">Approve</button>` : ''}
            </div>
        `;
        notificationList.appendChild(card);
    });
}

function approveNotification(globalIdx) {
    const notif = notifications[globalIdx];
    const hospital = nodes[notif.targetNodeIndex];
    if (hospital.availableBeds > 0) {
        notif.status = 'approved';
        hospital.availableBeds--;

        // Update global solver state to show this user's path
        shortestPaths = runDijkstra(notif.sourceNodeIndex);
        sourceInput.value = notif.sourceNodeIndex;
        displayResults(notif.sourceNodeIndex);

        // Close portal and return to map
        hospitalPortal.classList.add('hidden');
        currentlyActiveHospitalIndex = null;

        drawGraph();
        if (!isAnimating && notifications.some(n => n.status === 'approved')) {
            startAnimationLoop();
        }
        showToast(`Request from ${notif.userName} approved!`);
    } else {
        showToast("No beds available!", "error");
    }
}

backToMapBtn.onclick = () => {
    hospitalPortal.classList.add('hidden');
    currentlyActiveHospitalIndex = null;
    drawGraph();
};

editPortalHospBtn.onclick = () => {
    if (currentlyActiveHospitalIndex !== null) {
        openEditModal(currentlyActiveHospitalIndex);
    }
};

function openEditModal(index) {
    editingNodeIndex = index;
    const node = nodes[index];
    if (node.type === 'hospital') {
        editHospName.value = node.name;
        editHospBeds.value = node.availableBeds;
        editHospitalModal.style.display = 'block';
    } else {
        editNodeName.value = node.name;
        editNodePhone.value = node.phone || '';
        editNodeEmail.value = node.email || '';
        editNodeModal.style.display = 'block';
    }
}

saveNodeBtn.onclick = () => {
    if (editingNodeIndex !== null) {
        nodes[editingNodeIndex].name = editNodeName.value;
        nodes[editingNodeIndex].phone = editNodePhone.value;
        nodes[editingNodeIndex].email = editNodeEmail.value;
        editNodeModal.style.display = 'none';
        editingNodeIndex = null;
        drawGraph();
    }
};

saveHospBtn.onclick = () => {
    if (editingNodeIndex !== null) {
        nodes[editingNodeIndex].name = editHospName.value;
        nodes[editingNodeIndex].availableBeds = parseInt(editHospBeds.value) || 0;
        editHospitalModal.style.display = 'none';
        // If portal is open, update portal text
        if (currentlyActiveHospitalIndex === editingNodeIndex) {
            portalHospName.innerText = nodes[editingNodeIndex].name;
            portalBedsCount.innerText = nodes[editingNodeIndex].availableBeds;
        }
        editingNodeIndex = null;
        drawGraph();
    }
};

function findNodeAt(x, y) {
    const radius = 25;
    for (let i = 0; i < nodes.length; i++) {
        const dx = nodes[i].x - x;
        const dy = nodes[i].y - y;
        if (Math.sqrt(dx * dx + dy * dy) < radius) return i;
    }
    return null;
}

function calculateDistance(a, b) {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

// ========================================
// 2. DIJKSTRA ALGORITHM
// ========================================

/**
 * Core algorithm to find shortest paths from a source node
 */
function runDijkstra(source) {
    const n = nodes.length;
    const dist = Array(n).fill(Infinity);
    const prev = Array(n).fill(-1);
    const visited = Array(n).fill(false);

    dist[source] = 0;

    for (let i = 0; i < n; i++) {
        let u = -1;
        for (let j = 0; j < n; j++) {
            if (!visited[j] && (u === -1 || dist[j] < dist[u])) {
                u = j;
            }
        }

        if (u === -1 || dist[u] === Infinity) break;
        visited[u] = true;

        edges.forEach(edge => {
            let v = -1;
            if (edge.from === u) v = edge.to;
            else if (edge.to === u) v = edge.from;

            if (v !== -1 && !visited[v]) {
                const alt = dist[u] + edge.weight;
                if (alt < dist[v]) {
                    dist[v] = alt;
                    prev[v] = u;
                }
            }
        });
    }

    return { dist, prev };
}

// ========================================
// 3. UI HANDLERS & RENDERING
// ========================================

function drawGraph() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Edges
    edges.forEach(edge => {
        const from = nodes[edge.from];
        const to = nodes[edge.to];
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);

        ctx.strokeStyle = '#cbd5e1'; // Neutral grey
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.font = 'bold 12px Inter';
        ctx.fillStyle = '#475569';
        ctx.textAlign = 'center';
        ctx.fillText(edge.weight, (from.x + to.x) / 2, (from.y + to.y) / 2 - 5);
    });

    // Draw Shortest Paths
    if (shortestPaths) {
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 4;
        for (let i = 0; i < nodes.length; i++) {
            let curr = i;
            while (shortestPaths.prev[curr] !== -1) {
                const p = shortestPaths.prev[curr];
                const from = nodes[curr];
                const to = nodes[p];
                ctx.beginPath();
                ctx.moveTo(from.x, from.y);
                ctx.lineTo(to.x, to.y);
                ctx.stroke();
                curr = p;
            }
        }
    }

    // Draw Approved Paths (High-Fidelity "Flow" Animation)
    notifications.forEach(notif => {
        if (notif.status === 'approved') {
            const source = notif.sourceNodeIndex;
            const target = notif.targetNodeIndex;
            const result = runDijkstra(source);

            ctx.shadowColor = 'rgba(20, 184, 166, 0.4)';
            ctx.shadowBlur = 15;
            ctx.strokeStyle = '#14b8a6';
            ctx.lineWidth = 6;

            const dashOffset = (Date.now() / 40) % 30; // Flow direction
            ctx.setLineDash([15, 15]);
            ctx.lineDashOffset = dashOffset;

            let curr = target;
            while (result.prev[curr] !== -1) {
                const p = result.prev[curr];
                const fromNode = nodes[curr];
                const toNode = nodes[p];
                ctx.beginPath();
                ctx.moveTo(fromNode.x, fromNode.y);
                ctx.lineTo(toNode.x, toNode.y);
                ctx.stroke();
                curr = p;
            }

            ctx.shadowBlur = 0;
            ctx.setLineDash([]);
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';

            curr = target;
            while (result.prev[curr] !== -1) {
                const p = result.prev[curr];
                const fromNode = nodes[curr];
                const toNode = nodes[p];
                ctx.beginPath();
                ctx.moveTo(fromNode.x, fromNode.y);
                ctx.lineTo(toNode.x, toNode.y);
                ctx.stroke();
                curr = p;
            }
            ctx.setLineDash([]);
        }
    });

    // Draw Nodes
    nodes.forEach((node, index) => {
        // Node shadow for 3D effect
        ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 4;

        ctx.beginPath();
        ctx.arc(node.x, node.y, 22, 0, Math.PI * 2);
        // Vibrant Primary Colors
        ctx.fillStyle = index === selectedNodeIndex ? '#2dd4bf' : (node.type === 'hospital' ? '#ff4d4d' : '#14b8a6');
        ctx.fill();

        ctx.shadowBlur = 0; // Reset shadow for stroke and icons
        ctx.shadowOffsetY = 0;

        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = 'white';
        ctx.font = '900 16px "Font Awesome 6 Free"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.type === 'hospital' ? '\uf0f8' : '\uf007', node.x, node.y);

        ctx.font = 'bold 10px Inter';
        ctx.fillStyle = '#1e293b'; // High contrast text
        ctx.textBaseline = 'top';
        ctx.fillText(`${node.name} (ID: ${node.id})`, node.x, node.y + 30);

        ctx.font = '8px Inter';
        if (node.type === 'hospital') {
            ctx.fillText(`Beds: ${node.availableBeds}`, node.x, node.y + 42);
        }
    });
}

function startAnimationLoop() {
    if (isAnimating) return;
    isAnimating = true;
    function animate() {
        drawGraph();
        if (notifications.some(n => n.status === 'approved')) {
            requestAnimationFrame(animate);
        } else {
            isAnimating = false;
        }
    }
    animate();
}

function displayResults(source) {
    pathsList.innerHTML = '';
    const sourceNode = nodes[source];

    for (let i = 0; i < nodes.length; i++) {
        if (i === source) continue;
        const distance = shortestPaths.dist[i];
        if (distance === Infinity) continue;

        const targetNode = nodes[i];
        const path = [];
        let curr = i;
        while (curr !== -1) {
            path.push(nodes[curr].name);
            curr = shortestPaths.prev[curr];
        }
        path.reverse();

        const div = document.createElement('div');
        div.className = 'path-item';
        div.innerHTML = `
            <div class="path-info"><b>${sourceNode.name}</b> → <b>${targetNode.name}</b>: ${distance}</div>
            <div class="path-visual">${path.join(' → ')}</div>
        `;

        if (targetNode.type === 'hospital') {
            const btn = document.createElement('button');
            btn.className = 'request-btn';
            btn.innerText = 'Notify Hospital';
            btn.onclick = () => sendNotification(source, i, distance, path.join(' → '));
            div.appendChild(btn);
        }

        pathsList.appendChild(div);
    }
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';
    toast.innerHTML = `<i class="fas ${icon}"></i><span>${message}</span>`;

    container.appendChild(toast);

    // Auto remove after 4 seconds
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function sendNotification(sourceIdx, targetIdx, distance, pathStr) {
    const sourceNode = nodes[sourceIdx];
    const targetNode = nodes[targetIdx];

    const exists = notifications.some(n => n.sourceNodeIndex === sourceIdx && n.targetNodeIndex === targetIdx && n.status === 'pending');
    if (exists) {
        showToast("A notification is already pending.", "error");
        return;
    }

    notifications.push({
        sourceNodeIndex: sourceIdx,
        targetNodeIndex: targetIdx,
        userName: sourceNode.name,
        distance: distance,
        path: pathStr,
        status: 'pending'
    });

    showToast(`Notification sent to ${targetNode.name}!`);
}

// ========================================
// 4. EVENT LISTENERS
// ========================================

addUserBtn.addEventListener('click', () => { currentMode = 'user'; updateBtnStates(); });
addHospitalBtn.addEventListener('click', () => { currentMode = 'hospital'; updateBtnStates(); });
addEdgeBtn.addEventListener('click', () => { currentMode = 'edge'; updateBtnStates(); });

function updateBtnStates() {
    addUserBtn.classList.toggle('active', currentMode === 'user');
    addHospitalBtn.classList.toggle('active', currentMode === 'hospital');
    addEdgeBtn.classList.toggle('active', currentMode === 'edge');
    selectedNodeIndex = null;
}

demoBtn.addEventListener('click', () => {
    nodes = [
        { id: 0, x: 140, y: 80, type: 'hospital', name: 'City Hospital', availableBeds: 45 },
        { id: 1, x: 310, y: 60, type: 'user', name: 'Alice Smith', phone: '+1 111 222 333', email: 'alice@med.com', availableBeds: 0 },
        { id: 2, x: 160, y: 220, type: 'user', name: 'Bob Johnson', phone: '+1 444 555 666', email: 'bob@med.com', availableBeds: 0 },
        { id: 3, x: 510, y: 120, type: 'hospital', name: 'West Medical', availableBeds: 10 },
        { id: 4, x: 360, y: 220, type: 'user', name: 'Charlie Brown', phone: '+1 777 888 999', email: 'charlie@med.com', availableBeds: 0 },
        { id: 5, x: 640, y: 80, type: 'hospital', name: 'East Clinic', availableBeds: 5 },
        { id: 6, x: 560, y: 250, type: 'user', name: 'Diana Prince', phone: '+1 222 333 444', email: 'diana@med.com', availableBeds: 0 },
        { id: 7, x: 180, y: 380, type: 'user', name: 'Eve Online', phone: '+1 555 666 777', email: 'eve@med.com', availableBeds: 0 },
        { id: 8, x: 380, y: 380, type: 'user', name: 'Frank Castle', phone: '+1 888 999 000', email: 'frank@med.com', availableBeds: 0 },
        { id: 9, x: 610, y: 350, type: 'user', name: 'Grace Hopper', phone: '+1 123 456 789', email: 'grace@med.com', availableBeds: 0 },
        { id: 10, x: 680, y: 180, type: 'user', name: 'Hank Pym', phone: '+1 987 654 321', email: 'hank@med.com', availableBeds: 0 },
        { id: 11, x: 100, y: 300, type: 'user', name: 'Ivy League', phone: '+1 321 654 987', email: 'ivy@med.com', availableBeds: 0 },
        { id: 12, x: 260, y: 450, type: 'user', name: 'Jack Reacher', phone: '+1 456 789 123', email: 'jack@med.com', availableBeds: 0 },
        { id: 13, x: 510, y: 450, type: 'user', name: 'Kelly Kapur', phone: '+1 789 123 456', email: 'kelly@med.com', availableBeds: 0 },
        { id: 14, x: 710, y: 420, type: 'user', name: 'Leo Messi', phone: '+1 159 753 486', email: 'leo@med.com', availableBeds: 0 }
    ];
    edges = [
        { from: 0, to: 1, weight: 20 }, { from: 0, to: 2, weight: 15 },
        { from: 1, to: 3, weight: 25 }, { from: 2, to: 4, weight: 18 },
        { from: 3, to: 5, weight: 15 }, { from: 3, to: 6, weight: 20 },
        { from: 4, to: 7, weight: 25 }, { from: 4, to: 8, weight: 12 },
        { from: 6, to: 9, weight: 15 }, { from: 5, to: 10, weight: 10 },
        { from: 2, to: 11, weight: 22 }, { from: 7, to: 12, weight: 15 },
        { from: 8, to: 13, weight: 18 }, { from: 9, to: 14, weight: 20 },
        { from: 11, to: 7, weight: 15 }, { from: 10, to: 9, weight: 25 },
        { from: 3, to: 4, weight: 15 }, { from: 1, to: 5, weight: 30 }
    ];
    emptyState.style.display = 'none';
    shortestPaths = null;
    pathsList.innerHTML = '<div class="empty-hint">Paths will appear here after calculation</div>';
    drawGraph();
});

clearBtn.addEventListener('click', () => {
    nodes = [];
    edges = [];
    shortestPaths = null;
    emptyState.style.display = 'block';
    pathsList.innerHTML = '<div class="empty-hint">Paths will appear here after calculation</div>';
    drawGraph();
});

runBtn.addEventListener('click', () => {
    const source = parseInt(sourceInput.value);
    if (isNaN(source) || source < 0 || source >= nodes.length) {
        showToast("Enter a valid source node ID", "error");
        return;
    }
    shortestPaths = runDijkstra(source);
    displayResults(source);
    drawGraph();
});

infoIcon.onclick = () => modal.style.display = "block";
closeModal.onclick = () => {
    modal.style.display = "none";
    editNodeModal.style.display = "none";
    editHospitalModal.style.display = "none";
};
window.onclick = (e) => {
    if (e.target == modal) modal.style.display = "none";
    if (e.target == editNodeModal) editNodeModal.style.display = "none";
    if (e.target == editHospitalModal) editHospitalModal.style.display = "none";
};

// Also attach individual close buttons for the new modals
document.querySelectorAll('.close-modal').forEach(btn => {
    btn.onclick = () => {
        modal.style.display = "none";
        editNodeModal.style.display = "none";
        editHospitalModal.style.display = "none";
    };
});

// ========================================
// 5. INITIALIZATION
// ========================================

window.addEventListener('resize', resizeCanvas);
window.onload = () => {
    setTimeout(resizeCanvas, 50);
};

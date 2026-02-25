/**
 * MEDPATH PRO - CORE LOGIC (script.js)
 */

// Function to update Three.js particles based on theme
function updateParticleTheme(dark) {
    if (typeof particlesMesh !== 'undefined' && particlesMesh && particlesMesh.material) {
        particlesMesh.material.color.setHex(dark ? 0x14b8a6 : 0x0d9488);
        particlesMesh.material.opacity = dark ? 0.8 : 0.4;
    }
}

// --- THEME MANAGEMENT ---
const themeToggleBtn = document.getElementById('themeToggleBtn');
let isDarkMode = !document.body.classList.contains('light-theme');

function initTheme() {
    const savedTheme = localStorage.getItem('medpath-theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        isDarkMode = false;
        if (themeToggleBtn) themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        document.body.classList.remove('light-theme');
        isDarkMode = true;
        if (themeToggleBtn) themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
    }
}
// --- PRELOADER DISMISSAL ---
window.addEventListener('load', () => {
    const preloader = document.getElementById('preloader');
    if (preloader) {
        // Minimum delay to appreciate the animation
        setTimeout(() => {
            preloader.classList.add('loaded');
            // Remove from DOM after transition
            setTimeout(() => {
                preloader.remove();
            }, 800);
        }, 1500);
    }
});

initTheme();

if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('light-theme');
        isDarkMode = !document.body.classList.contains('light-theme');
        themeToggleBtn.innerHTML = isDarkMode ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
        localStorage.setItem('medpath-theme', isDarkMode ? 'dark' : 'light');
        if (typeof updateParticleTheme === 'function') updateParticleTheme(isDarkMode);
        drawGraph();
    });
}

// ============================================================================
// 1. API CONFIG & AUTH HELPERS
// ============================================================================

const API = '/api';

/** Returns Authorization header object if a JWT token is stored. */
function authHeaders() {
    const token = localStorage.getItem('adminToken');
    return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        : { 'Content-Type': 'application/json' };
}

/** Generic JSON fetch wrapper — returns [data, error]. */
async function apiFetch(url, options = {}) {
    try {
        const res = await fetch(url, {
            headers: authHeaders(),
            ...options
        });
        const data = await res.json();
        if (!res.ok) return [null, data.error || 'Server error'];
        return [data, null];
    } catch (err) {
        return [null, 'Cannot reach server. Is it running on port 5001?'];
    }
}

// ============================================================================
// 2. VISUALIZER STATE & DOM REFERENCES
// ============================================================================

// --- Canvas & Context ---
const canvas = document.getElementById('graph-canvas');
const ctx = canvas.getContext('2d');
const container = document.getElementById('canvas-container');
const emptyState = document.getElementById('empty-state');

// --- Control Buttons ---
const addUserBtn = document.getElementById('addUserBtn');
const addHospitalBtn = document.getElementById('addHospitalBtn');
const addEdgeBtn = document.getElementById('addEdgeBtn');
const clearBtn = document.getElementById('clearBtn');
const runBtn = document.getElementById('runBtn');
const demoBtn = document.getElementById('demoBtn');

// --- Input & Output ---
const sourceInput = document.getElementById('sourceNode');
const pathsList = document.getElementById('pathsList');
const infoIcon = document.querySelector('.info-icon');
const modal = document.getElementById('instructionsModal');

// --- Edit Modals ---
const editNodeModal = document.getElementById('editNodeModal');
const editHospitalModal = document.getElementById('editHospitalModal');
const editNodeName = document.getElementById('edit-node-name');
const editNodePhone = document.getElementById('edit-node-phone');
const editNodeEmail = document.getElementById('edit-node-email');
const saveNodeBtn = document.getElementById('save-node-btn');
const editHospName = document.getElementById('edit-hosp-name');
const editHospBeds = document.getElementById('edit-hosp-beds');
const saveHospBtn = document.getElementById('save-hosp-btn');

// --- Hospital Portal ---
const hospitalPortal = document.getElementById('hospital-portal');
const backToMapBtn = document.getElementById('backToMapBtn');
const portalHospName = document.getElementById('portal-hosp-name');
const portalBedsCount = document.getElementById('portal-beds-count');
const editPortalHospBtn = document.getElementById('editPortalHospBtn');
const notificationList = document.getElementById('notification-list');
const adminBadge = document.getElementById('admin-badge');
const logoutBtn = document.getElementById('logoutBtn');

// --- Admin Login Modal ---
const adminLoginModal = document.getElementById('adminLoginModal');
const adminLoginBtn = document.getElementById('adminLoginBtn');
const adminEmailInput = document.getElementById('admin-email-input');
const adminPasswordInput = document.getElementById('admin-password');
const adminLoginError = document.getElementById('admin-login-error');
const closeAdminLoginModal = document.getElementById('closeAdminLoginModal');
const togglePwBtn = document.getElementById('togglePw');
const adminHeaderBtn = document.getElementById('adminHeaderBtn');

// --- Forgot Password Modal ---
const forgotPasswordModal = document.getElementById('forgotPasswordModal');
const forgotPwLink = document.getElementById('forgotPwLink');
const backToLoginLink = document.getElementById('backToLoginLink');
const sendResetBtn = document.getElementById('sendResetBtn');
const forgotEmailInput = document.getElementById('forgot-email-input');
const forgotSuccess = document.getElementById('forgot-success');
const forgotError = document.getElementById('forgot-error');
const forgotErrorText = document.getElementById('forgotErrorText');
const closeForgotModal = document.getElementById('closeForgotModal');

// --- Admin Dashboard ---
const adminDashboard = document.getElementById('admin-dashboard');
const adminDashLogoutBtn = document.getElementById('adminDashLogoutBtn');
const adminBackBtn = document.getElementById('adminBackBtn');
const adminEmailTag = document.getElementById('adminEmailTag');

// --- Application State (mirrors DB data) ---
let nodes = [];           // Array of node objects from MongoDB
let edges = [];           // Array of edge objects from MongoDB
let notifications = [];   // Array of notification objects from MongoDB

let currentMode = 'user';    // 'user', 'hospital', or 'edge'
let selectedNodeIndex = null;      // Edge creation first-node tracker
let editingNodeId = null;      // MongoDB _id of node being edited
let editingNodeIndex = null;      // Array index of node being edited
let currentlyActiveHospitalIndex = null;
let shortestPaths = null;
let isAnimating = false;
let isAdminLoggedIn = false;
let pendingHospitalIndex = null;     // Hospital to open after admin login

// ============================================================================
// 3. DATA LOADING (from MongoDB via API)
// ============================================================================

/**
 * Loads all nodes and edges from the backend on startup.
 */
async function loadData() {
    const [nodeData, nodeErr] = await apiFetch(`${API}/nodes`);
    const [edgeData, edgeErr] = await apiFetch(`${API}/edges`);
    const [notifData] = await apiFetch(`${API}/notifications`);

    if (!nodeErr && nodeData) {
        nodes = nodeData.map(n => ({
            _id: n._id,
            id: n.nodeId,
            x: n.x, y: n.y,
            type: n.type,
            name: n.name,
            phone: n.phone || '',
            email: n.email || '',
            availableBeds: n.availableBeds || 0,
            approved: n.approved || false
        }));
    }

    if (!edgeErr && edgeData) {
        edges = edgeData.map(e => ({ _id: e._id, from: e.from, to: e.to, weight: e.weight }));
    }

    if (notifData) {
        notifications = notifData.map(n => ({
            _id: n._id,
            sourceNodeIndex: n.sourceNodeIndex,
            targetNodeIndex: n.targetNodeIndex,
            userName: n.userName,
            distance: n.distance,
            path: n.path,
            status: n.status
        }));
    }

    if (nodes.length > 0) emptyState.style.display = 'none';

    // Ensure canvas is transparent for 3D background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGraph();
}

// ============================================================================
// 4. CANVAS RENDERING & USER INTERACTION
// ============================================================================

function resizeCanvas() {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    drawGraph();
}

canvas.addEventListener('mousedown', async (e) => {
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
                const from = nodes[selectedNodeIndex].id;
                const to = nodes[clickedIndex].id;
                const weight = Math.round(dist / 10);

                // Optimistic UI update
                const exists = edges.some(e =>
                    (e.from === from && e.to === to) || (e.from === to && e.to === from)
                );
                if (!exists) {
                    const tempEdge = { from, to, weight };
                    edges.push(tempEdge);
                    drawGraph();

                    // Persist to DB
                    const [saved, err] = await apiFetch(`${API}/edges`, {
                        method: 'POST',
                        body: JSON.stringify({ from, to, weight })
                    });
                    if (err) {
                        edges.pop(); // Rollback on error
                        showToast(`Failed to save edge: ${err}`, 'error');
                    } else {
                        edges[edges.length - 1]._id = saved._id; // Store DB id
                    }
                }
                selectedNodeIndex = null;
            }
        }
    } else {
        if (clickedIndex !== null) {
            const node = nodes[clickedIndex];
            if (node.type === 'hospital') {
                openHospitalPortal(clickedIndex);
            } else {
                openEditModal(clickedIndex);
            }
        } else {
            // Add new node
            const margin = 50;
            const clampedX = Math.max(margin, Math.min(canvas.width - margin, x));
            const clampedY = Math.max(margin, Math.min(canvas.height - margin, y));
            const newId = nodes.length > 0 ? Math.max(...nodes.map(n => n.id)) + 1 : 0;

            const newNode = {
                id: newId, x: clampedX, y: clampedY,
                type: currentMode,
                name: currentMode === 'hospital' ? `Hospital ${newId}` : `User ${newId}`,
                phone: currentMode === 'user' ? '+1 234 567 890' : '',
                email: currentMode === 'user' ? 'user@example.com' : '',
                availableBeds: currentMode === 'hospital' ? 20 : 0,
                approved: false
            };

            // Optimistic add
            nodes.push(newNode);
            emptyState.style.display = 'none';
            drawGraph();

            // Persist to DB
            const [saved, err] = await apiFetch(`${API}/nodes`, {
                method: 'POST',
                body: JSON.stringify({
                    nodeId: newNode.id,
                    x: newNode.x, y: newNode.y,
                    type: newNode.type,
                    name: newNode.name,
                    phone: newNode.phone,
                    email: newNode.email,
                    availableBeds: newNode.availableBeds
                })
            });

            if (err) {
                nodes.pop(); // Rollback
                showToast(`Failed to save node: ${err}`, 'error');
                drawGraph();
            } else {
                nodes[nodes.length - 1]._id = saved._id;
            }
        }
    }
    drawGraph();
});

// ============================================================================
// 5. HOSPITAL PORTAL
// ============================================================================

function openHospitalPortal(index) {
    if (!isAdminLoggedIn) {
        pendingHospitalIndex = index;
        adminEmailInput.value = '';
        adminPasswordInput.value = '';
        adminLoginError.classList.add('hidden');
        adminLoginModal.style.display = 'block';
        setTimeout(() => adminEmailInput.focus(), 100);
        return;
    }
    currentlyActiveHospitalIndex = index;
    const node = nodes[index];
    portalHospName.innerText = node.name;
    portalBedsCount.innerText = node.availableBeds;
    hospitalPortal.classList.remove('hidden');
    adminBadge.classList.remove('hidden');
    logoutBtn.classList.remove('hidden');
    renderPortalNotifications();
}

function renderPortalNotifications() {
    notificationList.innerHTML = '';
    const all = notifications.filter(n => n.targetNodeIndex === currentlyActiveHospitalIndex);

    if (all.length === 0) {
        notificationList.innerHTML = '<div class="empty-hint">No incoming notifications</div>';
        return;
    }

    const pending = all.filter(n => n.status === 'pending');
    const approved = all.filter(n => n.status === 'approved');
    const rejected = all.filter(n => n.status === 'rejected');

    function renderSection(label, icon, items, sectionClass) {
        if (items.length === 0) return;
        const header = document.createElement('div');
        header.className = `notif-section-header ${sectionClass}`;
        header.innerHTML = `<i class="fas ${icon}"></i> ${label} <span class="section-count">${items.length}</span>`;
        notificationList.appendChild(header);

        items.forEach(notif => {
            const card = document.createElement('div');
            card.className = 'notification-card';

            const actionBtns = (notif.status === 'pending' && isAdminLoggedIn)
                ? `<button class="btn btn-run" onclick="portalApprove('${notif._id}')">
                       <i class="fas fa-circle-check"></i> Approve
                   </button>
                   <button class="btn btn-reject" onclick="portalReject('${notif._id}')">
                       <i class="fas fa-circle-xmark"></i> Reject
                   </button>` : '';

            const badgeClass = notif.status === 'approved' ? 'status-approved'
                : notif.status === 'rejected' ? 'status-rejected' : 'status-pending';

            const detailLine = notif.status === 'approved'
                ? `<p>Distance: <b>${notif.distance}</b> | Path: ${notif.path}</p>`
                : notif.status === 'rejected'
                    ? '<p><i>Request was rejected by the hospital.</i></p>'
                    : '<p><i>Awaiting admin review...</i></p>';

            card.innerHTML = `
                <div class="notif-info">
                    <h4>From: ${notif.userName} (ID: ${notif.sourceNodeIndex})</h4>
                    ${detailLine}
                    <div class="status-badge ${badgeClass}">${notif.status}</div>
                </div>
                <div class="notif-actions">${actionBtns}</div>
            `;
            notificationList.appendChild(card);
        });
    }

    renderSection('Pending', 'fa-clock', pending, 'section-pending');
    renderSection('Approved', 'fa-circle-check', approved, 'section-approved');
    renderSection('Rejected', 'fa-circle-xmark', rejected, 'section-rejected');
}

async function portalApprove(notifId) {
    const notif = notifications.find(n => n._id === notifId);
    if (!notif) return;
    const hospital = nodes.find(n => n.id === notif.targetNodeIndex);
    if (!hospital || hospital.availableBeds <= 0) {
        return showToast('No beds available!', 'error');
    }

    const [updated, err] = await apiFetch(`${API}/notifications/${notifId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'approved' })
    });
    if (err) return showToast(err, 'error');

    notif.status = 'approved';
    hospital.availableBeds--;
    portalBedsCount.innerText = hospital.availableBeds;

    shortestPaths = runDijkstra(notif.sourceNodeIndex);
    sourceInput.value = notif.sourceNodeIndex;
    displayResults(notif.sourceNodeIndex);
    drawGraph();

    if (!isAnimating && notifications.some(n => n.status === 'approved')) startAnimationLoop();
    showToast(`✅ Request from ${notif.userName} approved!`);
    renderPortalNotifications();
}

async function portalReject(notifId) {
    const notif = notifications.find(n => n._id === notifId);
    if (!notif) return;

    const [, err] = await apiFetch(`${API}/notifications/${notifId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'rejected' })
    });
    if (err) return showToast(err, 'error');

    notif.status = 'rejected';
    renderPortalNotifications();
    showToast(`❌ Request from ${notif.userName} was rejected.`, 'error');
}

backToMapBtn.onclick = () => {
    hospitalPortal.classList.add('hidden');
    currentlyActiveHospitalIndex = null;
    drawGraph();
};

logoutBtn.onclick = () => {
    isAdminLoggedIn = false;
    localStorage.removeItem('adminToken');
    adminBadge.classList.add('hidden');
    logoutBtn.classList.add('hidden');
    hospitalPortal.classList.add('hidden');
    currentlyActiveHospitalIndex = null;
    drawGraph();
    showToast('Admin logged out.');
};

editPortalHospBtn.onclick = () => {
    if (currentlyActiveHospitalIndex !== null) openEditModal(currentlyActiveHospitalIndex);
};

// ============================================================================
// 6. ADMIN LOGIN / LOGOUT
// ============================================================================

// Open admin login modal from the header button
adminHeaderBtn.onclick = () => {
    if (localStorage.getItem('adminToken')) {
        window.location.href = 'admin.html';
        return;
    }
    adminEmailInput.value = '';
    adminPasswordInput.value = '';
    adminLoginError.classList.add('hidden');
    adminLoginModal.style.display = 'block';
    setTimeout(() => adminEmailInput.focus(), 100);
};

// Login handler — posts to backend, stores JWT
adminLoginBtn.onclick = async () => {
    const email = adminEmailInput.value.trim();
    const password = adminPasswordInput.value;

    if (!email || !password) {
        adminLoginError.classList.remove('hidden');
        adminLoginError.innerHTML = '<i class="fas fa-triangle-exclamation"></i> Please enter email and password.';
        return;
    }

    adminLoginBtn.disabled = true;
    adminLoginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';

    const [data, err] = await apiFetch(`${API}/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });

    adminLoginBtn.disabled = false;
    adminLoginBtn.innerHTML = '<i class="fas fa-unlock"></i> Login as Admin';

    if (err) {
        adminLoginError.classList.remove('hidden');
        adminLoginError.innerHTML = `<i class="fas fa-triangle-exclamation"></i> ${err}`;
        const content = adminLoginModal.querySelector('.modal-content');
        content.classList.remove('shake');
        void content.offsetWidth;
        content.classList.add('shake');
        return;
    }

    // Successful login
    localStorage.setItem('adminToken', data.token);
    adminLoginError.classList.add('hidden');
    adminLoginModal.style.display = 'none';
    showToast(`✅ Welcome, Admin! Redirecting...`);

    setTimeout(() => {
        window.location.href = 'admin.html';
    }, 1000);
};

// Enter key support
adminPasswordInput.addEventListener('keydown', e => { if (e.key === 'Enter') adminLoginBtn.click(); });
adminEmailInput.addEventListener('keydown', e => { if (e.key === 'Enter') adminPasswordInput.focus(); });

togglePwBtn.onclick = () => {
    const isText = adminPasswordInput.type === 'text';
    adminPasswordInput.type = isText ? 'password' : 'text';
    togglePwBtn.innerHTML = isText ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
};



// Forgot password link
forgotPwLink.onclick = (e) => {
    e.preventDefault();
    adminLoginModal.style.display = 'none';
    forgotSuccess.classList.add('hidden');
    forgotError.classList.add('hidden');
    forgotEmailInput.value = adminEmailInput.value || '';
    forgotPasswordModal.style.display = 'block';
    setTimeout(() => forgotEmailInput.focus(), 100);
};

backToLoginLink.onclick = (e) => {
    e.preventDefault();
    forgotPasswordModal.style.display = 'none';
    adminLoginModal.style.display = 'block';
};



// Send reset link
sendResetBtn.onclick = async () => {
    const email = forgotEmailInput.value.trim();
    if (!email) {
        forgotErrorText.textContent = 'Please enter your email.';
        forgotError.classList.remove('hidden');
        return;
    }

    sendResetBtn.disabled = true;
    sendResetBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

    const [, err] = await apiFetch(`${API}/auth/forgot-password`, {
        method: 'POST',
        body: JSON.stringify({ email })
    });

    sendResetBtn.disabled = false;
    sendResetBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Reset Link';

    if (err) {
        forgotErrorText.textContent = err;
        forgotError.classList.remove('hidden');
        forgotSuccess.classList.add('hidden');
    } else {
        forgotSuccess.classList.remove('hidden');
        forgotError.classList.add('hidden');
    }
};


window.addEventListener('click', e => {
    if (e.target === adminLoginModal) adminLoginModal.style.display = 'none';
    if (e.target === forgotPasswordModal) forgotPasswordModal.style.display = 'none';
});


// ============================================================================
// 8. EDIT MODALS
// ============================================================================

function openEditModal(index) {
    editingNodeIndex = index;
    editingNodeId = nodes[index]._id;
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

saveNodeBtn.onclick = async () => {
    if (editingNodeId === null) return;
    const updates = {
        name: editNodeName.value,
        phone: editNodePhone.value,
        email: editNodeEmail.value
    };
    const [, err] = await apiFetch(`${API}/nodes/${editingNodeId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
    });
    if (err) return showToast(err, 'error');

    Object.assign(nodes[editingNodeIndex], updates);
    editNodeModal.style.display = 'none';
    editingNodeId = null;
    drawGraph();
};

saveHospBtn.onclick = async () => {
    if (editingNodeId === null) return;
    const updates = {
        name: editHospName.value,
        availableBeds: parseInt(editHospBeds.value) || 0
    };
    const [, err] = await apiFetch(`${API}/nodes/${editingNodeId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
    });
    if (err) return showToast(err, 'error');

    Object.assign(nodes[editingNodeIndex], updates);
    editHospitalModal.style.display = 'none';

    if (currentlyActiveHospitalIndex === editingNodeIndex) {
        portalHospName.innerText = nodes[editingNodeIndex].name;
        portalBedsCount.innerText = nodes[editingNodeIndex].availableBeds;
    }
    editingNodeId = null;
    drawGraph();
};

// ============================================================================
// 9. DIJKSTRA'S ALGORITHM
// ============================================================================

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

function runDijkstra(source) {
    const n = nodes.length;
    const dist = Array(n).fill(Infinity);
    const prev = Array(n).fill(-1);
    const visited = Array(n).fill(false);
    dist[source] = 0;

    for (let i = 0; i < n; i++) {
        let u = -1;
        for (let j = 0; j < n; j++) {
            if (!visited[j] && (u === -1 || dist[j] < dist[u])) u = j;
        }
        if (u === -1 || dist[u] === Infinity) break;
        visited[u] = true;

        edges.forEach(edge => {
            let v = -1;
            if (edge.from === u) v = edge.to;
            else if (edge.to === u) v = edge.from;
            if (v !== -1 && !visited[v]) {
                const alt = dist[u] + edge.weight;
                if (alt < dist[v]) { dist[v] = alt; prev[v] = u; }
            }
        });
    }
    return { dist, prev };
}

// ============================================================================
// 10. CANVAS RENDERING ENGINE
// ============================================================================

function drawGraph() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dynamic edge styling
    edges.forEach(edge => {
        const from = nodes.find(n => n.id === edge.from);
        const to = nodes.find(n => n.id === edge.to);
        if (!from || !to) return;

        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.strokeStyle = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.1)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Edge Weight
        ctx.font = '600 12px Inter';
        ctx.fillStyle = isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(15, 23, 42, 0.5)';
        ctx.textAlign = 'center';
        ctx.fillText(edge.weight, (from.x + to.x) / 2, (from.y + to.y) / 2 - 5);
    });

    // Shortest paths highlight (Solid Cyan)
    if (shortestPaths) {
        ctx.strokeStyle = '#2dd4bf';
        ctx.lineWidth = 4;
        for (let i = 0; i < nodes.length; i++) {
            let curr = i;
            while (shortestPaths.prev[curr] !== -1) {
                const p = shortestPaths.prev[curr];
                ctx.beginPath();
                ctx.moveTo(nodes[curr].x, nodes[curr].y);
                ctx.lineTo(nodes[p].x, nodes[p].y);
                ctx.stroke();
                curr = p;
            }
        }
    }

    // Approved animated paths (Vibrant Teal)
    notifications.forEach(notif => {
        if (notif.status !== 'approved') return;
        const sourceIdx = nodes.findIndex(n => n.id === notif.sourceNodeIndex);
        const targetIdx = nodes.findIndex(n => n.id === notif.targetNodeIndex);
        if (sourceIdx === -1 || targetIdx === -1) return;
        const result = runDijkstra(sourceIdx);

        ctx.strokeStyle = '#14b8a6';
        ctx.lineWidth = 5;
        const dashOffset = (Date.now() / 30) % 40;
        ctx.setLineDash([20, 15]);
        ctx.lineDashOffset = -dashOffset;

        let curr = targetIdx;
        while (result.prev[curr] !== -1) {
            const p = result.prev[curr];
            ctx.beginPath();
            ctx.moveTo(nodes[curr].x, nodes[curr].y);
            ctx.lineTo(nodes[p].x, nodes[p].y);
            ctx.stroke();
            curr = p;
        }

        ctx.setLineDash([]);
    });

    // Nodes (Premium Gradients)
    nodes.forEach((node, index) => {
        const isSelected = index === selectedNodeIndex;

        // Outer Glow
        ctx.shadowColor = node.type === 'hospital' ? 'rgba(255, 62, 62, 0.4)' : 'rgba(16, 185, 129, 0.4)';
        ctx.shadowBlur = isSelected ? 25 : 15;

        // Node Body
        const gradient = ctx.createRadialGradient(node.x - 5, node.y - 5, 5, node.x, node.y, 22);
        if (isSelected) {
            gradient.addColorStop(0, '#5eead4');
            gradient.addColorStop(1, '#14b8a6');
        } else if (node.type === 'hospital') {
            gradient.addColorStop(0, '#ff6b6b');
            gradient.addColorStop(1, '#ff3e3e');
        } else {
            gradient.addColorStop(0, '#34d399');
            gradient.addColorStop(1, '#10b981');
        }

        ctx.beginPath();
        ctx.arc(node.x, node.y, 22, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Inner Border
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Icon
        ctx.fillStyle = 'white';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        ctx.font = '900 16px "Font Awesome 6 Free"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.type === 'hospital' ? '\uf0f8' : '\uf007', node.x, node.y);

        // Label
        ctx.shadowBlur = 0;
        ctx.font = 'bold 12px Inter';
        ctx.fillStyle = isDarkMode ? '#ffffff' : '#1e293b';
        ctx.textBaseline = 'top';
        ctx.fillText(node.name, node.x, node.y + 32);

        ctx.font = '500 10px Inter';
        ctx.fillStyle = isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(15, 23, 42, 0.6)';
        ctx.fillText(`ID: ${node.id}`, node.x, node.y + 48);

        if (node.type === 'hospital') {
            ctx.fillStyle = isDarkMode ? '#ff8080' : '#dc2626';
            ctx.font = 'bold 10px Inter';
            ctx.fillText(`Beds: ${node.availableBeds}`, node.x, node.y + 62);
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

// ============================================================================
// 11. TOAST NOTIFICATIONS
// ============================================================================

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';
    toast.innerHTML = `<i class="fas ${icon}"></i><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ============================================================================
// 12. SEND NOTIFICATION (Emergency Request)
// ============================================================================

async function sendNotification(sourceIdx, targetIdx, distance, pathStr) {
    const sourceNode = nodes[sourceIdx];
    const targetNode = nodes[targetIdx];

    const exists = notifications.some(n =>
        n.sourceNodeIndex === nodes[sourceIdx].id &&
        n.targetNodeIndex === nodes[targetIdx].id &&
        n.status === 'pending'
    );
    if (exists) return showToast('A notification is already pending.', 'error');

    const [saved, err] = await apiFetch(`${API}/notifications`, {
        method: 'POST',
        body: JSON.stringify({
            sourceNodeIndex: sourceNode.id,
            targetNodeIndex: targetNode.id,
            userName: sourceNode.name,
            distance, path: pathStr
        })
    });

    if (err) return showToast(err, 'error');

    notifications.push({
        _id: saved._id,
        sourceNodeIndex: sourceNode.id,
        targetNodeIndex: targetNode.id,
        userName: sourceNode.name,
        distance, path: pathStr,
        status: 'pending'
    });

    showToast(`Notification sent to ${targetNode.name}!`);
}

// ============================================================================
// 13. BUTTON MODES & DEMO DATA
// ============================================================================

addUserBtn.addEventListener('click', () => { currentMode = 'user'; updateBtnStates(); });
addHospitalBtn.addEventListener('click', () => { currentMode = 'hospital'; updateBtnStates(); });
addEdgeBtn.addEventListener('click', () => { currentMode = 'edge'; updateBtnStates(); });

function updateBtnStates() {
    addUserBtn.classList.toggle('active', currentMode === 'user');
    addHospitalBtn.classList.toggle('active', currentMode === 'hospital');
    addEdgeBtn.classList.toggle('active', currentMode === 'edge');
    selectedNodeIndex = null;
}

demoBtn.addEventListener('click', async () => {
    if (!confirm('This will load demo data. Existing data will remain. Continue?')) return;

    const margin = 70;
    const W = canvas.width - margin * 2;
    const H = canvas.height - margin * 2;
    const px = fx => Math.round(margin + fx * W);
    const py = fy => Math.round(margin + fy * H);

    const demoNodes = [
        { nodeId: 0, x: px(0.13), y: py(0.12), type: 'hospital', name: 'City Hospital', availableBeds: 45 },
        { nodeId: 1, x: px(0.35), y: py(0.08), type: 'user', name: 'Alice Smith', phone: '+1 111 222 333', email: 'alice@med.com' },
        { nodeId: 2, x: px(0.14), y: py(0.38), type: 'user', name: 'Bob Johnson', phone: '+1 444 555 666', email: 'bob@med.com' },
        { nodeId: 3, x: px(0.53), y: py(0.16), type: 'hospital', name: 'West Medical', availableBeds: 10 },
        { nodeId: 4, x: px(0.40), y: py(0.38), type: 'user', name: 'Charlie Brown', phone: '+1 777 888 999', email: 'charlie@med.com' },
        { nodeId: 5, x: px(0.75), y: py(0.10), type: 'hospital', name: 'East Clinic', availableBeds: 5 },
        { nodeId: 6, x: px(0.65), y: py(0.38), type: 'user', name: 'Diana Prince', phone: '+1 222 333 444', email: 'diana@med.com' },
        { nodeId: 7, x: px(0.18), y: py(0.60), type: 'user', name: 'Eve Online', phone: '+1 555 666 777', email: 'eve@med.com' },
        { nodeId: 8, x: px(0.42), y: py(0.60), type: 'user', name: 'Frank Castle', phone: '+1 888 999 000', email: 'frank@med.com' },
        { nodeId: 9, x: px(0.65), y: py(0.58), type: 'user', name: 'Grace Hopper', phone: '+1 123 456 789', email: 'grace@med.com' },
    ];

    const demoEdges = [
        { from: 0, to: 1, weight: 20 }, { from: 0, to: 2, weight: 15 },
        { from: 1, to: 3, weight: 25 }, { from: 2, to: 4, weight: 18 },
        { from: 3, to: 5, weight: 15 }, { from: 3, to: 6, weight: 20 },
        { from: 4, to: 7, weight: 25 }, { from: 4, to: 8, weight: 12 },
        { from: 6, to: 9, weight: 15 },
    ];

    showToast('Loading demo data...');

    for (const n of demoNodes) {
        const [saved] = await apiFetch(`${API}/nodes`, { method: 'POST', body: JSON.stringify(n) });
        if (saved) nodes.push({ ...n, id: n.nodeId, _id: saved._id, approved: false });
    }
    for (const e of demoEdges) {
        const [saved] = await apiFetch(`${API}/edges`, { method: 'POST', body: JSON.stringify(e) });
        if (saved) edges.push({ ...e, _id: saved._id });
    }

    emptyState.style.display = 'none';
    shortestPaths = null;
    pathsList.innerHTML = '<div class="empty-hint">Paths will appear here after calculation</div>';
    drawGraph();
    showToast('Demo data loaded! ✅');
});

// Clear all
clearBtn.addEventListener('click', async () => {
    if (!confirm('Clear ALL nodes, edges, and notifications from the database?')) return;

    const token = localStorage.getItem('adminToken');
    if (!token) { showToast('Admin login required to clear data.', 'error'); return; }

    const [, err] = await apiFetch(`${API}/nodes`, { method: 'DELETE' });
    if (err) return showToast(err, 'error');

    nodes = []; edges = []; notifications = [];
    shortestPaths = null;
    emptyState.style.display = 'block';
    pathsList.innerHTML = '<div class="empty-hint">Paths will appear here after calculation</div>';
    drawGraph();
    showToast('All data cleared.');
});

// Run Dijkstra
runBtn.addEventListener('click', () => {
    const source = parseInt(sourceInput.value);
    if (isNaN(source) || source < 0 || source >= nodes.length) {
        showToast('Enter a valid source node ID', 'error');
        return;
    }
    shortestPaths = runDijkstra(source);
    displayResults(source);
    drawGraph();
});

// ============================================================================
// 14. MODAL CLOSE HANDLERS
// ============================================================================

infoIcon.onclick = () => modal.style.display = 'block';

document.querySelectorAll('.close-modal').forEach(btn => {
    btn.onclick = () => {
        const parentModal = btn.closest('.modal');
        if (parentModal) parentModal.style.display = 'none';

        // Also ensure individual variables are handled if they don't use .modal class properly
        modal.style.display = 'none';
        editNodeModal.style.display = 'none';
        editHospitalModal.style.display = 'none';
        adminLoginModal.style.display = 'none';
        forgotPasswordModal.style.display = 'none';
    };
});

window.onclick = (e) => {
    if (e.target === modal) modal.style.display = 'none';
    if (e.target === editNodeModal) editNodeModal.style.display = 'none';
    if (e.target === editHospitalModal) editHospitalModal.style.display = 'none';
};

// ============================================================================
// 15. INITIALIZATION
// ============================================================================

window.addEventListener('resize', resizeCanvas);

window.onload = async () => {
    setTimeout(async () => {
        resizeCanvas();
        // Check for existing JWT and auto-restore admin session
        const token = localStorage.getItem('adminToken');
        if (token) {
            const [data] = await apiFetch(`${API}/auth/verify`);
            if (data && data.valid) {
                isAdminLoggedIn = true;
                showToast('Admin session restored.', 'success');
            } else {
                localStorage.removeItem('adminToken');
            }
        }
        // Load all data from MongoDB
        await loadData();
        init3DBackground();
    }, 50);
};

// Global reference for theme updates
let particlesMesh;

// ============================================================================
// 16. THREE.JS 3D BACKGROUND
// ============================================================================

function init3DBackground() {
    const container = document.getElementById('bg-canvas-container');
    if (!container || !window.THREE) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });

    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    // Particles
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 200;
    const posArray = new Float32Array(particlesCount * 3);

    for (let i = 0; i < particlesCount * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 10;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

    const particlesMaterial = new THREE.PointsMaterial({
        size: 0.02,
        color: !document.body.classList.contains('light-theme') ? 0x14b8a6 : 0x0d9488,
        transparent: true,
        opacity: !document.body.classList.contains('light-theme') ? 0.8 : 0.4,
        blending: THREE.AdditiveBlending
    });

    particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);

    // Neural Network Lines (Simplistic for performance)
    const linesMaterial = new THREE.LineBasicMaterial({ color: 0x14b8a6, transparent: true, opacity: 0.1 });
    const linesGeometry = new THREE.BufferGeometry();
    scene.add(new THREE.LineSegments(linesGeometry, linesMaterial));

    camera.position.z = 3;

    let mouseX = 0;
    let mouseY = 0;

    window.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    function animate() {
        requestAnimationFrame(animate);

        particlesMesh.rotation.y += 0.001;
        particlesMesh.rotation.x += 0.0005;

        // Mouse follow effect
        particlesMesh.position.x += (mouseX - particlesMesh.position.x) * 0.05;
        particlesMesh.position.y += (-mouseY - particlesMesh.position.y) * 0.05;

        renderer.render(scene, camera);
    }

    animate();

    window.addEventListener('resize', () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    });
}

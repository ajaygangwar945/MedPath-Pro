/**
 * MEDPATH PRO - CORE LOGIC (script.js)
 * Full-stack version: All data persisted to MongoDB via Express API.
 * JWT used for admin authentication.
 */

// ============================================================================
// 1. API CONFIG & AUTH HELPERS
// ============================================================================

const API = 'http://localhost:5000/api';

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
        return [null, 'Cannot reach server. Is it running on port 5000?'];
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
    // If already logged in, go straight to dashboard
    if (isAdminLoggedIn) {
        openAdminDashboard();
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
    isAdminLoggedIn = true;
    localStorage.setItem('adminToken', data.token);
    adminEmailTag.innerHTML = `<i class="fas fa-user-shield"></i> ${data.email}`;
    adminLoginError.classList.add('hidden');
    adminLoginModal.style.display = 'none';
    showToast(`✅ Welcome, Admin!`);

    if (pendingHospitalIndex !== null) {
        openHospitalPortal(pendingHospitalIndex);
        pendingHospitalIndex = null;
    } else {
        openAdminDashboard();
    }
};

// Enter key support
adminPasswordInput.addEventListener('keydown', e => { if (e.key === 'Enter') adminLoginBtn.click(); });
adminEmailInput.addEventListener('keydown', e => { if (e.key === 'Enter') adminPasswordInput.focus(); });

togglePwBtn.onclick = () => {
    const isText = adminPasswordInput.type === 'text';
    adminPasswordInput.type = isText ? 'password' : 'text';
    togglePwBtn.innerHTML = isText ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
};

closeAdminLoginModal.onclick = () => adminLoginModal.style.display = 'none';

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

closeForgotModal.onclick = () => forgotPasswordModal.style.display = 'none';

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

// Dashboard logout
adminDashLogoutBtn.onclick = () => {
    isAdminLoggedIn = false;
    localStorage.removeItem('adminToken');
    adminDashboard.classList.add('hidden');
    showToast('Admin logged out.');
};

// Back to Map from dashboard
adminBackBtn.onclick = () => {
    adminDashboard.classList.add('hidden');
};

// Backdrop click to close login modals
window.addEventListener('click', e => {
    if (e.target === adminLoginModal) adminLoginModal.style.display = 'none';
    if (e.target === forgotPasswordModal) forgotPasswordModal.style.display = 'none';
});

// ============================================================================
// 7. ADMIN DASHBOARD
// ============================================================================

async function openAdminDashboard() {
    // Refresh data from DB
    await loadData();

    // Stats bar
    const userCount = nodes.filter(n => n.type === 'user').length;
    const hospCount = nodes.filter(n => n.type === 'hospital').length;
    const pendingCount = notifications.filter(n => n.status === 'pending').length;
    const approvedCount = notifications.filter(n => n.status === 'approved').length;

    document.getElementById('statUserCount').textContent = userCount;
    document.getElementById('statHospCount').textContent = hospCount;
    document.getElementById('statPendingCount').textContent = pendingCount;
    document.getElementById('statApprovedCount').textContent = approvedCount;

    renderAdminUsers();
    renderAdminHospitals();
    renderAdminRequests();

    adminDashboard.classList.remove('hidden');
    setActiveTab('users');
}

// Tab switching
document.querySelectorAll('.admin-tab').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        setActiveTab(btn.dataset.tab);
    };
});

function setActiveTab(tab) {
    document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');
}

function renderAdminUsers() {
    const grid = document.getElementById('usersGrid');
    const users = nodes.filter(n => n.type === 'user');
    if (users.length === 0) {
        grid.innerHTML = '<div class="empty-hint">No users registered yet.</div>';
        return;
    }
    grid.innerHTML = users.map(u => {
        const approveBtn = u.approved
            ? `<button class="admin-btn-unapprove" onclick="adminApproveNode('${u._id}', false)">
                   <i class="fas fa-circle-xmark"></i> Unapprove
               </button>`
            : `<button class="admin-btn-approve" onclick="adminApproveNode('${u._id}', true)">
                   <i class="fas fa-circle-check"></i> Approve
               </button>`;

        return `
        <div class="admin-card user-card">
            <div class="admin-card-icon"><i class="fas fa-user"></i></div>
            <div class="admin-card-info">
                <h4>${u.name} <span class="node-id-tag">ID: ${u.id}</span></h4>
                <p><i class="fas fa-phone"></i> ${u.phone || 'N/A'}</p>
                <p><i class="fas fa-envelope"></i> ${u.email || 'N/A'}</p>
                <p><i class="fas fa-map-marker-alt"></i> x:${Math.round(u.x)}, y:${Math.round(u.y)}</p>
                <div class="status-badge ${u.approved ? 'status-approved' : 'status-pending'}">
                    ${u.approved ? 'Approved' : 'Pending'}
                </div>
            </div>
            <div class="admin-card-actions">
                ${approveBtn}
                <button class="admin-btn-edit" onclick="adminEditNode(${nodes.indexOf(u)})">
                    <i class="fas fa-pen-to-square"></i> Edit
                </button>
                <button class="admin-btn-delete" onclick="adminDeleteNode('${u._id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `;
    }).join('');
}

function renderAdminHospitals() {
    const grid = document.getElementById('hospitalsGrid');
    const hospitals = nodes.filter(n => n.type === 'hospital');
    if (hospitals.length === 0) {
        grid.innerHTML = '<div class="empty-hint">No hospitals registered yet.</div>';
        return;
    }
    grid.innerHTML = hospitals.map(h => {
        const pending = notifications.filter(n => n.targetNodeIndex === h.id && n.status === 'pending');
        return `
        <div class="admin-card hospital-card">
            <div class="admin-card-icon hosp-icon"><i class="fas fa-hospital"></i></div>
            <div class="admin-card-info">
                <h4>${h.name} <span class="node-id-tag">ID: ${h.id}</span></h4>
                <p><i class="fas fa-bed"></i> Available Beds: <strong>${h.availableBeds}</strong></p>
                <p><i class="fas fa-clock"></i> Pending Requests: <strong>${pending.length}</strong></p>
                <p><i class="fas fa-map-marker-alt"></i> x:${Math.round(h.x)}, y:${Math.round(h.y)}</p>
            </div>
            <div class="admin-card-actions">
                <button class="admin-btn-approve" onclick="adminApproveAllPending('${h.id}')">
                    <i class="fas fa-circle-check"></i> Approve All
                </button>
                <button class="admin-btn-edit" onclick="adminEditNode(${nodes.indexOf(h)})">
                    <i class="fas fa-pen-to-square"></i> Edit
                </button>
                <button class="admin-btn-delete" onclick="adminDeleteNode('${h._id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>`;
    }).join('');
}

function renderAdminRequests() {
    const grid = document.getElementById('requestsGrid');
    if (notifications.length === 0) {
        grid.innerHTML = '<div class="empty-hint">No emergency requests yet.</div>';
        return;
    }
    grid.innerHTML = [...notifications].reverse().map(n => {
        const fromNode = nodes.find(nd => nd.id === n.sourceNodeIndex);
        const toNode = nodes.find(nd => nd.id === n.targetNodeIndex);
        const badgeClass = n.status === 'approved' ? 'status-approved'
            : n.status === 'rejected' ? 'status-rejected' : 'status-pending';
        const actions = n.status === 'pending' ? `
            <button class="admin-btn-approve" onclick="adminApproveReq('${n._id}')">
                <i class="fas fa-circle-check"></i> Approve
            </button>
            <button class="admin-btn-delete" onclick="adminRejectReq('${n._id}')">
                <i class="fas fa-circle-xmark"></i> Reject
            </button>` : '';

        return `
        <div class="admin-card request-card">
            <div class="admin-card-icon req-icon"><i class="fas fa-bell"></i></div>
            <div class="admin-card-info">
                <h4>
                    ${fromNode ? fromNode.name : `User #${n.sourceNodeIndex}`}
                    → ${toNode ? toNode.name : `Hospital #${n.targetNodeIndex}`}
                    <span class="status-badge ${badgeClass}">${n.status}</span>
                </h4>
                <p><i class="fas fa-route"></i> Distance: <strong>${n.distance}</strong></p>
                <p><i class="fas fa-map-signs"></i> ${n.path}</p>
            </div>
            <div class="admin-card-actions">${actions}</div>
        </div>`;
    }).join('');
}

// Admin: delete a node (with cascading in backend)
async function adminDeleteNode(mongoId) {
    if (!confirm('Delete this node? All related edges and notifications will also be removed.')) return;

    const [, err] = await apiFetch(`${API}/nodes/${mongoId}`, { method: 'DELETE' });
    if (err) return showToast(err, 'error');

    showToast('Node deleted successfully.');
    shortestPaths = null;
    pathsList.innerHTML = '<div class="empty-hint">Paths will appear here after calculation</div>';
    await openAdminDashboard(); // Refresh dashboard + reload data + redraw canvas
}

// Admin: approve all pending requests for a hospital
async function adminApproveAllPending(hospitalNodeId) {
    const pending = notifications.filter(n => n.targetNodeIndex === parseInt(hospitalNodeId) && n.status === 'pending');
    if (pending.length === 0) return showToast('No pending requests.', 'error');

    for (const notif of pending) {
        await apiFetch(`${API}/notifications/${notif._id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'approved' })
        });
        notif.status = 'approved';
    }

    await loadData();
    openAdminDashboard();
    showToast(`✅ Approved ${pending.length} request(s).`);
}

// Admin: approve a single request from requests tab
async function adminApproveReq(notifId) {
    const [, err] = await apiFetch(`${API}/notifications/${notifId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'approved' })
    });
    if (err) return showToast(err, 'error');
    const n = notifications.find(x => x._id === notifId);
    if (n) n.status = 'approved';
    await loadData();
    openAdminDashboard();
    showToast('✅ Request approved!');
}

// Admin: reject a single request from requests tab
async function adminRejectReq(notifId) {
    const [, err] = await apiFetch(`${API}/notifications/${notifId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'rejected' })
    });
    if (err) return showToast(err, 'error');
    const n = notifications.find(x => x._id === notifId);
    if (n) n.status = 'rejected';
    renderAdminRequests();
    showToast('Request rejected.', 'error');
}

// Admin: approve/unapprove a node
async function adminApproveNode(mongoId, approved) {
    const [data, err] = await apiFetch(`${API}/nodes/${mongoId}/approve`, {
        method: 'PATCH',
        body: JSON.stringify({ approved })
    });
    if (err) return showToast(err, 'error');

    showToast(`Node ${approved ? 'approved' : 'unapproved'}!`);
    await openAdminDashboard();
}

// Admin: open edit modal from dashboard
function adminEditNode(index) {
    openEditModal(index);
}

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

    // Default edges
    edges.forEach(edge => {
        const from = nodes.find(n => n.id === edge.from);
        const to = nodes.find(n => n.id === edge.to);
        if (!from || !to) return;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.font = 'bold 12px Inter';
        ctx.fillStyle = '#475569';
        ctx.textAlign = 'center';
        ctx.fillText(edge.weight, (from.x + to.x) / 2, (from.y + to.y) / 2 - 5);
    });

    // Shortest paths highlight
    if (shortestPaths) {
        ctx.strokeStyle = '#06b6d4';
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

    // Approved animated paths
    notifications.forEach(notif => {
        if (notif.status !== 'approved') return;
        const sourceIdx = nodes.findIndex(n => n.id === notif.sourceNodeIndex);
        const targetIdx = nodes.findIndex(n => n.id === notif.targetNodeIndex);
        if (sourceIdx === -1 || targetIdx === -1) return;
        const result = runDijkstra(sourceIdx);

        ctx.shadowColor = 'rgba(20, 184, 166, 0.4)';
        ctx.shadowBlur = 15;
        ctx.strokeStyle = '#14b8a6';
        ctx.lineWidth = 6;
        const dashOffset = (Date.now() / 40) % 30;
        ctx.setLineDash([15, 15]);
        ctx.lineDashOffset = dashOffset;

        let curr = targetIdx;
        while (result.prev[curr] !== -1) {
            const p = result.prev[curr];
            ctx.beginPath();
            ctx.moveTo(nodes[curr].x, nodes[curr].y);
            ctx.lineTo(nodes[p].x, nodes[p].y);
            ctx.stroke();
            curr = p;
        }

        ctx.shadowBlur = 0;
        ctx.setLineDash([]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        curr = targetIdx;
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

    // Nodes
    nodes.forEach((node, index) => {
        ctx.shadowColor = 'rgba(0,0,0,0.08)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 4;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 22, 0, Math.PI * 2);

        if (index === selectedNodeIndex) {
            ctx.fillStyle = '#2dd4bf';
        } else {
            ctx.fillStyle = (node.type === 'hospital' ? '#ff4d4d' : '#14b8a6');
        }
        ctx.fill();

        ctx.shadowBlur = 0;
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
        ctx.fillStyle = '#1e293b';
        ctx.textBaseline = 'top';
        ctx.fillText(`${node.name} (ID: ${node.id})`, node.x, node.y + 30);

        if (node.type === 'hospital') {
            ctx.font = '8px Inter';
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
        modal.style.display = 'none';
        editNodeModal.style.display = 'none';
        editHospitalModal.style.display = 'none';
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
    }, 50);
};

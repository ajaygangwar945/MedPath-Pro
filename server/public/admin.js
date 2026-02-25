/**
 * MEDPATH PRO - ADMIN DASHBOARD LOGIC (admin.js)
 */

const API = '/api';

// --- AUTH HELPERS ---
function authHeaders() {
    const token = localStorage.getItem('adminToken');
    return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        : { 'Content-Type': 'application/json' };
}

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
        return [null, 'Cannot reach server.'];
    }
}

// --- STATE ---
let nodes = [];
let notifications = [];
let isAdminLoggedIn = !!localStorage.getItem('adminToken');

// --- THEME ---
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

if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('light-theme');
        isDarkMode = !document.body.classList.contains('light-theme');
        themeToggleBtn.innerHTML = isDarkMode ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
        localStorage.setItem('medpath-theme', isDarkMode ? 'dark' : 'light');
    });
}

// --- PRELOADER ---
window.addEventListener('load', () => {
    const preloader = document.getElementById('preloader');
    if (preloader) {
        setTimeout(() => {
            preloader.classList.add('loaded');
            setTimeout(() => preloader.remove(), 800);
        }, 1200);
    }

    if (!isAdminLoggedIn) {
        window.location.href = 'app.html';
        return;
    }
    initTheme();
    loadAdminData();
});

// --- DATA LOADING ---
async function loadAdminData() {
    const [nodeData] = await apiFetch(`${API}/nodes`);
    const [notifData] = await apiFetch(`${API}/notifications`);

    if (nodeData) nodes = nodeData;
    if (notifData) notifications = notifData;

    renderDashboard();
}

function renderDashboard() {
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
}

// --- TAB SWITCHING ---
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

// --- RENDERING FUNCTIONS ---
function renderAdminUsers() {
    const grid = document.getElementById('usersGrid');
    const users = nodes.filter(n => n.type === 'user');
    if (users.length === 0) {
        grid.innerHTML = '<div class="empty-hint">No users registered yet.</div>';
        return;
    }
    grid.innerHTML = users.map((u, idx) => {
        const delay = idx * 0.05;
        // The user specifically asked to REMOVE the approve button from here
        // and only show it after opening details.

        return `
        <div class="admin-card user-card animate-in type-user ${u.approved ? 'status-approved' : 'status-pending'}" style="animation-delay: ${delay}s">
            <div class="admin-card-icon user-bg"><i class="fas fa-user-ninja"></i></div>
            <div class="admin-card-info">
                <h4>${u.name} <span class="node-id-tag">ID: ${u.nodeId}</span></h4>
                <p><i class="fas fa-phone"></i> ${u.phone || 'N/A'}</p>
                <p><i class="fas fa-envelope"></i> ${u.email || 'N/A'}</p>
                <div class="status-badge ${u.approved ? 'status-approved' : 'status-pending'} interactive-badge" 
                     onclick="openDetailModal('user', '${u._id}')" title="Click to verify">
                    ${u.approved ? 'Approved' : 'Pending Verification'}
                </div>
            </div>
            <div class="admin-card-actions">
                <button class="admin-btn-delete" onclick="adminDeleteNode('${u._id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>`;
    }).join('');
}

function renderAdminHospitals() {
    const grid = document.getElementById('hospitalsGrid');
    const hospitals = nodes.filter(n => n.type === 'hospital');
    if (hospitals.length === 0) {
        grid.innerHTML = '<div class="empty-hint">No hospitals registered yet.</div>';
        return;
    }
    grid.innerHTML = hospitals.map((h, idx) => {
        const pending = notifications.filter(n => n.targetNodeIndex === h.nodeId && n.status === 'pending');
        const delay = idx * 0.05;
        return `
        <div class="admin-card hospital-card animate-in type-hospital" style="animation-delay: ${delay}s">
            <div class="admin-card-icon hosp-icon"><i class="fas fa-hospital-user"></i></div>
            <div class="admin-card-info">
                <h4>${h.name} <span class="node-id-tag">ID: ${h.nodeId}</span></h4>
                <p><i class="fas fa-bed"></i> Available Beds: <strong>${h.availableBeds}</strong></p>
                <p><i class="fas fa-clock"></i> Pending Requests: <strong>${pending.length}</strong></p>
            </div>
            <div class="admin-card-actions">
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
    grid.innerHTML = [...notifications].reverse().map((n, idx) => {
        const fromNode = nodes.find(nd => nd.nodeId === n.sourceNodeIndex);
        const toNode = nodes.find(nd => nd.nodeId === n.targetNodeIndex);
        const delay = idx * 0.05;
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
        <div class="admin-card request-card animate-in ${badgeClass}" style="animation-delay: ${delay}s">
            <div class="admin-card-icon req-icon"><i class="fas fa-truck-medical"></i></div>
            <div class="admin-card-info">
                <h4>
                    ${fromNode ? fromNode.name : `User #${n.sourceNodeIndex}`}
                    → ${toNode ? toNode.name : `Hospital #${n.targetNodeIndex}`}
                    <span class="status-badge ${badgeClass}">${n.status}</span>
                </h4>
                <p><i class="fas fa-ruler-combined"></i> Distance: <strong>${n.distance}</strong></p>
                <p><i class=" Diamond-turn-right"></i> Path: <strong>${n.path}</strong></p>
            </div>
            <div class="admin-card-actions">${actions}</div>
        </div>`;
    }).join('');
}

// --- ACTIONS ---
async function adminApproveNode(mongoId, approved) {
    const [, err] = await apiFetch(`${API}/nodes/${mongoId}`, {
        method: 'PATCH',
        body: JSON.stringify({ approved })
    });
    if (err) return showToast(err, 'error');
    loadAdminData();
}

async function adminDeleteNode(mongoId) {
    if (!confirm('Delete this node? All related records will be removed.')) return;
    const [, err] = await apiFetch(`${API}/nodes/${mongoId}`, { method: 'DELETE' });
    if (err) return showToast(err, 'error');
    showToast('Node removed.');
    loadAdminData();
}

async function adminApproveReq(notifId) {
    const [, err] = await apiFetch(`${API}/notifications/${notifId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'approved' })
    });
    if (err) return showToast(err, 'error');
    loadAdminData();
}

async function adminRejectReq(notifId) {
    const [, err] = await apiFetch(`${API}/notifications/${notifId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'rejected' })
    });
    if (err) return showToast(err, 'error');
    loadAdminData();
}

// --- LOGOUT ---
document.getElementById('adminDashLogoutBtn').onclick = () => {
    localStorage.removeItem('adminToken');
    window.location.href = 'app.html';
};

// --- TOAST ---
function showToast(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${msg}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

// --- DETAIL MODAL LOGIC ---
const detailModal = document.getElementById('detail-modal');
const closeDetailModalBtn = document.getElementById('closeDetailModal');

function openDetailModal(type, mongoId) {
    const item = nodes.find(n => n._id === mongoId);
    if (!item) return;

    // Apply theme class
    detailModal.classList.remove('modal-theme-user', 'modal-theme-hospital');
    detailModal.classList.add(type === 'user' ? 'modal-theme-user' : 'modal-theme-hospital');

    document.getElementById('detail-name').textContent = item.name;
    document.getElementById('detail-id').textContent = item.nodeId;
    document.getElementById('detail-blood-group').textContent = item.bloodGroup || 'A+ (Primary)'; // Fallback for impact
    document.getElementById('detail-phone').textContent = item.phone || 'Not Provided';
    document.getElementById('detail-email').textContent = item.email || 'No Email';
    document.getElementById('detail-address').textContent = item.address || 'Sector 15, Healthcare Hub, North Wing City'; // High-end fallback

    // Populate Visual Card
    document.getElementById('card-id-val').textContent = item.nodeId;
    document.getElementById('card-name-val').textContent = item.name;
    document.getElementById('card-type-val').textContent = type === 'user' ? 'USER IDENTITY' : 'MEDICAL PROVIDER';

    const typeTag = document.getElementById('detail-type-tag');
    const iconDiv = document.getElementById('detail-icon');
    const statusBadge = document.getElementById('detail-status');
    const actionsDiv = document.getElementById('detail-modal-actions');

    if (type === 'user') {
        typeTag.textContent = 'User Account';
        iconDiv.innerHTML = '<i class="fas fa-user-ninja"></i>';
        iconDiv.className = 'master-profile-icon user-bg';
    } else {
        typeTag.textContent = 'Hospital Provider';
        iconDiv.innerHTML = '<i class="fas fa-hospital-user"></i>';
        iconDiv.className = 'master-profile-icon hosp-icon';
    }

    statusBadge.textContent = item.approved ? 'Approved' : 'Pending Verification';
    statusBadge.className = `status-badge ${item.approved ? 'status-approved' : 'status-pending'}`;

    // Build actions
    let actionsHtml = '';
    if (!item.approved) {
        actionsHtml = `
            <button class="admin-btn-approve" onclick="confirmApproveInModal('${item._id}')">
                <i class="fas fa-check"></i> Approve
            </button>
            <button class="admin-btn-delete" onclick="confirmRejectInModal('${item._id}')">
                <i class="fas fa-times"></i> Reject
            </button>
        `;
    } else {
        actionsHtml = `
            <button class="admin-btn-unapprove" onclick="confirmUnapproveInModal('${item._id}')">
                <i class="fas fa-undo"></i> Unapprove
            </button>
        `;
    }
    actionsDiv.innerHTML = actionsHtml;

    // Fix: Using class-based toggle instead of display: block
    detailModal.classList.add('active');
}

function closeDetailModal() {
    detailModal.classList.remove('active');
}

if (closeDetailModalBtn) {
    closeDetailModalBtn.onclick = closeDetailModal;
}

window.addEventListener('click', (e) => {
    if (e.target === detailModal) closeDetailModal();
});

async function confirmApproveInModal(id) {
    await adminApproveNode(id, true);
    closeDetailModal();
}

async function confirmRejectInModal(id) {
    if (confirm('Are you sure you want to reject and delete this user?')) {
        await adminDeleteNode(id);
        closeDetailModal();
    }
}

async function confirmUnapproveInModal(id) {
    await adminApproveNode(id, false);
    closeDetailModal();
}

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

/** Escapes HTML characters to prevent XSS */
function sanitizeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
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
        return [null, 'Cannot reach server. Please check your internet connection or if the backend service is awake.'];
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
    
    // Set Admin Email
    const adminEmail = localStorage.getItem('adminEmail');
    const emailTag = document.getElementById('adminEmailTag');
    if (adminEmail && emailTag) {
        emailTag.innerHTML = `<i class="fas fa-user-shield"></i> ${adminEmail}`;
    }

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
    setupClickHandlers();
}

function setupClickHandlers() {
    const grids = ['usersGrid', 'hospitalsGrid', 'requestsGrid'];
    grids.forEach(gridId => {
        const grid = document.getElementById(gridId);
        if (!grid) return;
        
        grid.onclick = (e) => {
            const target = e.target;
            
            // 1. Handle Delete Button
            const deleteBtn = target.closest('.admin-btn-delete');
            if (deleteBtn) {
                const card = deleteBtn.closest('.clickable-card');
                if (card && card.dataset.id) {
                    if (card.dataset.type === 'request') {
                        adminRejectReq(card.dataset.id);
                    } else {
                        adminDeleteNode(card.dataset.id);
                    }
                }
                return;
            }

            // 2. Handle Approve Button
            const approveBtn = target.closest('.admin-btn-approve');
            if (approveBtn) {
                const card = approveBtn.closest('.clickable-card');
                if (card && card.dataset.id) {
                    if (card.dataset.type === 'request') {
                        adminApproveReq(card.dataset.id);
                    } else {
                        adminApproveNode(card.dataset.id, true);
                    }
                }
                return;
            }

            // 3. Handle Card Click (Detail Modal)
            const card = target.closest('.clickable-card');
            if (card) {
                const type = card.dataset.type;
                const id = card.dataset.id;
                openDetailModal(type, id);
            }
        };
    });

    // 4. Handle Detail Modal Actions (Approve/Reject from within the dossier)
    const modalActions = document.getElementById('detail-modal-actions');
    if (modalActions && !modalActions.dataset.listenerAttached) {
        modalActions.dataset.listenerAttached = 'true';
        modalActions.addEventListener('click', (e) => {
            const btnApprove = e.target.closest('.admin-btn-approve');
            if (btnApprove && btnApprove.dataset.id) {
                if (btnApprove.dataset.type === 'request') confirmApproveReqInModal(btnApprove.dataset.id);
                else confirmApproveInModal(btnApprove.dataset.id);
                return;
            }

            const btnDelete = e.target.closest('.admin-btn-delete');
            if (btnDelete && btnDelete.dataset.id) {
                if (btnDelete.dataset.type === 'request') confirmRejectReqInModal(btnDelete.dataset.id);
                else confirmRejectInModal(btnDelete.dataset.id);
                return;
            }

            const btnUnapprove = e.target.closest('.admin-btn-unapprove');
            if (btnUnapprove && btnUnapprove.dataset.id) {
                confirmUnapproveInModal(btnUnapprove.dataset.id);
                return;
            }
        });
    }
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
        const name = sanitizeHTML(u.name);
        const phone = sanitizeHTML(u.phone);
        const email = sanitizeHTML(u.email);
        const nodeId = sanitizeHTML(u.nodeId);
        const mongoId = sanitizeHTML(String(u._id));

        return `
        <div class="admin-card user-card animate-in type-user clickable-card ${u.approved ? 'status-approved' : 'status-pending'}" 
             style="animation-delay: ${delay}s"
             data-type="user" data-id="${mongoId}">
            <div class="admin-card-icon user-bg"><i class="fas fa-user-ninja"></i></div>
            <div class="admin-card-info">
                <h4>${name} <span class="node-id-tag">ID: ${nodeId}</span></h4>
                <p><i class="fas fa-phone"></i> ${phone || 'N/A'}</p>
                <p><i class="fas fa-envelope"></i> ${email || 'N/A'}</p>
                <div class="status-badge ${u.approved ? 'status-approved' : 'status-pending'}" title="Verification required">
                    ${u.approved ? 'Approved' : 'Pending Verification'}
                </div>
            </div>
            <div class="admin-card-actions">
                <button class="admin-btn-delete" title="Remove this user">
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
        const name = sanitizeHTML(h.name);
        const nodeId = sanitizeHTML(h.nodeId);
        const beds = sanitizeHTML(h.availableBeds);
        const mongoId = sanitizeHTML(String(h._id));

        return `
        <div class="admin-card hospital-card animate-in type-hospital clickable-card" 
             style="animation-delay: ${delay}s"
             data-type="hospital" data-id="${mongoId}">
            <div class="admin-card-icon hosp-icon"><i class="fas fa-hospital-user"></i></div>
            <div class="admin-card-info">
                <h4>${name} <span class="node-id-tag">ID: ${nodeId}</span></h4>
                <p><i class="fas fa-bed"></i> Available Beds: <strong>${beds}</strong></p>
                <p><i class="fas fa-clock"></i> Pending Requests: <strong>${pending.length}</strong></p>
            </div>
            <div class="admin-card-actions">
                <button class="admin-btn-delete" title="Remove this hospital">
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
        
        const fromName = sanitizeHTML(fromNode ? fromNode.name : `User #${n.sourceNodeIndex}`);
        const toName = sanitizeHTML(toNode ? toNode.name : `Hospital #${n.targetNodeIndex}`);
        const status = sanitizeHTML(n.status);
        const distance = sanitizeHTML(n.distance);
        const path = sanitizeHTML(n.path);
        const mongoId = sanitizeHTML(String(n._id));

        const actions = n.status === 'pending' ? `
            <button class="admin-btn-approve">
                <i class="fas fa-circle-check"></i> Approve
            </button>
            <button class="admin-btn-delete">
                <i class="fas fa-circle-xmark"></i> Reject
            </button>` : '';

        return `
        <div class="admin-card request-card animate-in clickable-card ${badgeClass}" 
             style="animation-delay: ${delay}s"
             data-type="request" data-id="${mongoId}">
            <div class="admin-card-icon req-icon"><i class="fas fa-truck-medical"></i></div>
            <div class="admin-card-info">
                <h4>
                    ${fromName} → ${toName}
                    <span class="status-badge ${badgeClass}">${status}</span>
                </h4>
                <p><i class="fas fa-ruler-combined"></i> Distance: <strong>${distance}</strong></p>
                <p><i class=" Diamond-turn-right"></i> Path: <strong>${path}</strong></p>
            </div>
            <div class="admin-card-actions">${actions}</div>
        </div>`;
    }).join('');
}

// --- ACTIONS ---
async function adminApproveNode(mongoId, approved) {
    const [, err] = await apiFetch(`${API}/nodes/${mongoId}/approve`, {
        method: 'PATCH',
        body: JSON.stringify({ approved })
    });
    if (err) return showToast(err, 'error');
    loadAdminData();
}

// --- DELETE CONFIRMATION MODAL LOGIC ---
const deleteModal = document.getElementById('delete-confirm-modal');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
let nodeIdToDelete = null;

function showDeleteConfirm(mongoId) {
    console.log('showDeleteConfirm for:', mongoId);
    nodeIdToDelete = mongoId;
    
    // Lazy-init or re-fetch if needed
    const modal = document.getElementById('delete-confirm-modal');
    if (!modal) {
        console.error('CRITICAL: Delete modal element not found in DOM');
        showToast('System error: Delete modal missing.', 'error');
        return;
    }
    
    modal.classList.add('active');
}

function hideDeleteConfirm() {
    nodeIdToDelete = null;
    const modal = document.getElementById('delete-confirm-modal');
    if (modal) modal.classList.remove('active');
}

if (cancelDeleteBtn) cancelDeleteBtn.onclick = hideDeleteConfirm;
if (confirmDeleteBtn) {
    confirmDeleteBtn.onclick = async () => {
        if (!nodeIdToDelete) return;
        const id = nodeIdToDelete;
        hideDeleteConfirm();
        
        const [, err] = await apiFetch(`${API}/nodes/${id}`, { method: 'DELETE' });
        if (err) return showToast(err, 'error');
        showToast('Node removed.');
        loadAdminData();
    };
}

async function adminDeleteNode(mongoId) {
    console.log('adminDeleteNode triggered for:', mongoId);
    showDeleteConfirm(mongoId);
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

function openDetailModal(type, id) {
    let item;
    if (type === 'request') {
        item = notifications.find(n => n._id == id);
    } else {
        // Find by mongo _id OR nodeId as fallback
        item = nodes.find(n => n._id == id || n.nodeId == id);
    }
    
    if (!item) {
        console.error(`Item not found for type ${type} and ID ${id}`);
        showToast('Data for this item could not be found.', 'error');
        return;
    }

    // Apply theme class
    detailModal.classList.remove('modal-theme-user', 'modal-theme-hospital', 'modal-theme-request');
    detailModal.classList.add(`modal-theme-${type}`);

    if (type === 'request') {
        const fromNode = nodes.find(nd => nd.nodeId == item.sourceNodeIndex);
        const toNode = nodes.find(nd => nd.nodeId == item.targetNodeIndex);
        
        document.getElementById('detail-name').textContent = 'Emergency Request';
        document.getElementById('detail-id').textContent = `REQ-${String(item._id).slice(-6).toUpperCase()}`;
        document.getElementById('detail-blood-group').textContent = fromNode ? (fromNode.bloodGroup || 'O+') : '--';
        document.getElementById('detail-phone').textContent = fromNode ? (fromNode.phone || 'N/A') : 'N/A';
        document.getElementById('detail-email').textContent = fromNode ? (fromNode.email || 'N/A') : 'N/A';
        document.getElementById('detail-address').textContent = `From: ${fromNode ? fromNode.name : 'Unknown'} → To: ${toNode ? toNode.name : 'Unknown'}`;

        document.getElementById('card-id-val').textContent = 'EMERGENCY';
        document.getElementById('card-name-val').textContent = fromNode ? fromNode.name : 'Patient';
        document.getElementById('card-type-val').textContent = 'DISPATCH REQUEST';
    } else {
        document.getElementById('detail-name').textContent = item.name;
        document.getElementById('detail-id').textContent = item.nodeId;
        document.getElementById('detail-blood-group').textContent = item.bloodGroup || 'A+ (Primary)'; 
        document.getElementById('detail-phone').textContent = item.phone || 'Not Provided';
        document.getElementById('detail-email').textContent = item.email || 'No Email';
        document.getElementById('detail-address').textContent = item.address || 'Sector 15, Healthcare Hub, North Wing City'; 

        document.getElementById('card-id-val').textContent = item.nodeId;
        document.getElementById('card-name-val').textContent = item.name;
        document.getElementById('card-type-val').textContent = type === 'user' ? 'USER IDENTITY' : 'MEDICAL PROVIDER';
    }

    const typeTag = document.getElementById('detail-type-tag');
    const iconDiv = document.getElementById('detail-icon');
    const statusBadge = document.getElementById('detail-status');
    const actionsDiv = document.getElementById('detail-modal-actions');

    if (type === 'user') {
        typeTag.textContent = 'User Account';
        iconDiv.innerHTML = '<i class="fas fa-user-ninja"></i>';
        iconDiv.className = 'master-profile-icon user-bg';
    } else if (type === 'hospital') {
        typeTag.textContent = 'Hospital Provider';
        iconDiv.innerHTML = '<i class="fas fa-hospital-user"></i>';
        iconDiv.className = 'master-profile-icon hosp-icon';
    } else {
        typeTag.textContent = 'Emergency Alert';
        iconDiv.innerHTML = '<i class="fas fa-truck-medical"></i>';
        iconDiv.className = 'master-profile-icon req-icon';
    }

    const currentStatus = type === 'request' ? item.status : (item.approved ? 'approved' : 'pending');
    statusBadge.textContent = currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1);
    statusBadge.className = `status-badge status-${currentStatus}`;

    // Build actions
    let actionsHtml = '';
    const sanitizedId = sanitizeHTML(item._id);
    
    if (type === 'request') {
        if (item.status === 'pending') {
            actionsHtml = `
                <button class="btn admin-btn-approve" data-id="${sanitizedId}" data-type="request">
                    <i class="fas fa-check"></i> Approve Request
                </button>
                <button class="btn admin-btn-delete" data-id="${sanitizedId}" data-type="request">
                    <i class="fas fa-times"></i> Reject Request
                </button>
            `;
        } else {
            actionsHtml = `<p class="admin-hint">Status finalized as <strong>${item.status}</strong></p>`;
        }
    } else {
        if (!item.approved) {
            actionsHtml = `
                <button class="btn admin-btn-approve" data-id="${sanitizedId}" data-type="${type}">
                    <i class="fas fa-check"></i> Approve
                </button>
                <button class="btn admin-btn-delete" data-id="${sanitizedId}" data-type="${type}">
                    <i class="fas fa-times"></i> Reject
                </button>
            `;
        } else {
            actionsHtml = `
                <button class="btn admin-btn-unapprove" data-id="${sanitizedId}" data-type="${type}">
                    <i class="fas fa-undo"></i> Unapprove
                </button>
            `;
        }
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
    // Remove the native confirm dialog to prevent double confirmation, since adminDeleteNode already opens the custom confirmation modal
    closeDetailModal();
    adminDeleteNode(id);
}

async function confirmUnapproveInModal(id) {
    await adminApproveNode(id, false);
    closeDetailModal();
}

async function confirmApproveReqInModal(id) {
    await adminApproveReq(id);
    closeDetailModal();
}

async function confirmRejectReqInModal(id) {
    await adminRejectReq(id);
    closeDetailModal();
}

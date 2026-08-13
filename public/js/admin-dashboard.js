document.addEventListener('DOMContentLoaded', async () => {
  const adminDisplayName = document.getElementById('adminDisplayName');
  const user = API.getUser();
  if (adminDisplayName && user) {
    adminDisplayName.textContent = user.full_name || user.username || 'แอดมิน';
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      API.clearToken();
      window.location.href = '/login.html';
    });
  }

  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', renderUsersTable);
  }

  await loadAdminOverview();
  renderUsersTable();
});

async function loadAdminOverview() {
  try {
    const res = await API.request('/api/admin/overview');
    const data = res.data || {};

    const totalUsers = data.totalUsers ?? 0;
    const newThisMonth = data.newThisMonth ?? 0;

    const statTotalUsers = document.getElementById('statTotalUsers');
    const statNewThisMonth = document.getElementById('statNewThisMonth');

    if (statTotalUsers) statTotalUsers.textContent = totalUsers;
    if (statNewThisMonth) statNewThisMonth.textContent = newThisMonth;

    if (Array.isArray(data.caregivers)) {
      window.__adminCaregivers = data.caregivers;
      renderUsersTable();
    }
  } catch (err) {
    console.error('Failed to load admin overview:', err);
  }
}

function renderUsersTable() {
  const tableBody = document.getElementById('usersTableBody');
  const emptyState = document.getElementById('emptyAdminState');
  const searchInput = document.getElementById('searchInput');

  if (!tableBody) return;

  const caregivers = Array.isArray(window.__adminCaregivers) ? window.__adminCaregivers : [];
  const query = (searchInput ? searchInput.value : '').trim().toLowerCase();

  const filtered = caregivers.filter((user) => {
    if (!query) return true;
    const haystack = [user.full_name, user.username, user.email].join(' ').toLowerCase();
    return haystack.includes(query);
  });

  if (!filtered.length) {
    tableBody.innerHTML = '';
    if (emptyState) emptyState.classList.remove('d-none');
    return;
  }

  if (emptyState) emptyState.classList.add('d-none');

  const currentAdminId = API.getUser() ? API.getUser().userId : null;

  tableBody.innerHTML = filtered.map((user, index) => {
    const initials = (user.full_name || user.username || 'U')
      .split(' ')
      .map(part => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

    const createdAt = new Date(user.created_at);
    const createdText = createdAt.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    const deviceCount = Number(user.device_count || 0);

    const isSelf = currentAdminId && Number(user.user_id) === Number(currentAdminId);

    return `
      <tr>
        <td>${index + 1}</td>
        <td>
          <div class="d-flex align-items-center gap-2">
            <div class="user-avatar" style="background: linear-gradient(135deg, #8B5CF6, #6366F1);">${escapeHtml(initials)}</div>
            <div>
              <div class="fw-semibold">${escapeHtml(user.full_name || user.username)}</div>
            </div>
          </div>
        </td>
        <td>${escapeHtml(user.username)}</td>
        <td>${escapeHtml(user.email)}</td>
        <td><span class="badge-box-count">${deviceCount} กล่อง</span></td>
        <td>${createdText}</td>
        <td class="text-end">
          ${isSelf ? `<button class="btn btn-secondary" disabled title="ไม่สามารถลบบัญชีตัวเองได้">บัญชีของคุณ</button>` : `<button class="btn-delete-user" data-user-id="${user.user_id}" data-user-name="${escapeHtml(user.full_name || user.username)}"><i class="bi bi-trash me-1"></i>ลบ</button>`}
        </td>
      </tr>
    `;
  }).join('');

  tableBody.querySelectorAll('.btn-delete-user').forEach((button) => {
    button.addEventListener('click', () => {
      const userId = Number(button.dataset.userId);
      const userName = button.dataset.userName || 'ผู้ดูแล';
      openDeleteUserModal(userId, userName);
    });
  });
}

function openDeleteUserModal(userId, userName) {
  const modalEl = document.getElementById('deleteUserModal');
  if (!modalEl) return;

  const deleteUserName = document.getElementById('deleteUserName');
  if (deleteUserName) deleteUserName.textContent = userName;

  const confirmBtn = document.getElementById('confirmDeleteBtn');
  if (confirmBtn) {
    confirmBtn.onclick = async () => {
      // Prevent double-clicks and show progress
      confirmBtn.disabled = true;
      const originalHtml = confirmBtn.innerHTML;
      confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>กำลังลบ...';
      try {
        console.log('[Admin] Deleting user', userId);
        const token = API.getToken();
        const url = `/api/admin/users/${userId}`;
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const rawRes = await fetch(url, { method: 'DELETE', headers });
        const text = await rawRes.text();
        let body = null;
        try { body = text ? JSON.parse(text) : null; } catch (e) { body = text; }

        console.log('[Admin] Delete response', { status: rawRes.status, body });

        if (rawRes.status === 401 || rawRes.status === 403) {
          // clear token and surface message
          API.clearToken();
          throw new Error(body && body.message ? body.message : 'ไม่ได้รับสิทธิ์ กรุณาเข้าสู่ระบบใหม่');
        }

        if (!rawRes.ok) {
          throw new Error(body && body.message ? body.message : `ลบไม่สำเร็จ (status ${rawRes.status})`);
        }

        // success
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
        await loadAdminOverview();
      } catch (err) {
        console.error('[Admin] Delete user error:', err);
        alert(err && err.message ? err.message : 'ลบผู้ดูแลไม่สำเร็จ');
      } finally {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = originalHtml;
      }
    };
  }

  const bootstrapModal = new bootstrap.Modal(modalEl);
  bootstrapModal.show();
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[char]));
}

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
  await loadAdminDevices();
  renderUsersTable();
});

async function loadAdminOverview() {
  try {
    const res = await API.request('/api/admin/overview');
    const data = res.data || {};

    const totalUsers = data.totalUsers ?? 0;
    const totalBoxes = data.totalBoxes ?? 0;
    const newThisMonth = data.newThisMonth ?? 0;

    const statTotalUsers = document.getElementById('statTotalUsers');
    const statTotalBoxes = document.getElementById('statTotalBoxes');
    const statNewThisMonth = document.getElementById('statNewThisMonth');

    if (statTotalUsers) statTotalUsers.textContent = totalUsers;
    if (statTotalBoxes) statTotalBoxes.textContent = totalBoxes;
    if (statNewThisMonth) statNewThisMonth.textContent = newThisMonth;

    if (Array.isArray(data.caregivers)) {
      window.__adminCaregivers = data.caregivers;
      renderUsersTable();
    }
  } catch (err) {
    console.error('Failed to load admin overview:', err);
  }
}

async function loadAdminDevices() {
  try {
    const res = await API.request('/api/admin/devices');
    window.__adminDevices = Array.isArray(res.data) ? res.data : [];
    renderDeviceTable();
  } catch (err) {
    console.error('Failed to load admin devices:', err);
    const tbody = document.getElementById('devicesTableBody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center text-danger py-4">
            <i class="bi bi-exclamation-triangle me-2"></i>ไม่สามารถโหลดกล่องยาได้
          </td>
        </tr>
      `;
    }
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
          <button class="btn-delete-user" data-user-id="${user.user_id}" data-user-name="${escapeHtml(user.full_name || user.username)}">
            <i class="bi bi-trash me-1"></i>ลบ
          </button>
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
      try {
        await API.request(`/api/admin/users/${userId}`, { method: 'DELETE' });
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
        await loadAdminOverview();
        await loadAdminDevices();
      } catch (err) {
        alert(err.message || 'ลบผู้ดูแลไม่สำเร็จ');
      }
    };
  }

  const bootstrapModal = new bootstrap.Modal(modalEl);
  bootstrapModal.show();
}

function renderDeviceTable() {
  const tbody = document.getElementById('devicesTableBody');
  if (!tbody) return;

  const devices = window.__adminDevices || [];

  if (!devices.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted py-4">
          <i class="bi bi-box-seam me-2"></i>ยังไม่มีกล่องยาในระบบ
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = devices.map((device) => {
    const ownerName = device.caregiver_name || device.caregiver_username || 'ยังไม่มีผู้ดูแล';
    const status = device.status === 'Online' ? 'ออนไลน์' : 'ออฟไลน์';
    const statusClass = device.status === 'Online' ? 'bg-success' : 'bg-secondary';
    const batteryClass = Number(device.battery_level || 0) <= 20 ? 'text-danger' : Number(device.battery_level || 0) <= 50 ? 'text-warning' : 'text-success';

    return `
      <tr>
        <td>
          <div class="fw-semibold">${escapeHtml(device.box_name || 'กล่องยา')}</div>
          <small class="text-muted">${escapeHtml(device.location || 'ไม่ระบุพื้นที่')}</small>
        </td>
        <td><code>${escapeHtml(device.device_code || '-')}</code></td>
        <td>${escapeHtml(ownerName)}</td>
        <td><span class="badge ${statusClass}">${status}</span></td>
        <td><span class="fw-semibold ${batteryClass}">${Number(device.battery_level || 0)}%</span></td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-danger delete-device-btn" data-device-id="${device.box_id}" data-device-name="${escapeHtml(device.box_name || 'กล่องยา')}">
            <i class="bi bi-trash me-1"></i>ลบ
          </button>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('.delete-device-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const deviceId = Number(button.dataset.deviceId);
      const deviceName = button.dataset.deviceName || 'กล่องยา';
      openDeleteDeviceModal(deviceId, deviceName);
    });
  });
}

function openDeleteDeviceModal(deviceId, deviceName) {
  const modalEl = document.getElementById('deleteDeviceModal');
  if (!modalEl) return;

  const deviceNameEl = document.getElementById('deleteDeviceName');
  if (deviceNameEl) deviceNameEl.textContent = deviceName;

  const confirmBtn = document.getElementById('confirmDeleteDeviceBtn');
  if (confirmBtn) {
    confirmBtn.onclick = async () => {
      try {
        await API.request(`/api/admin/devices/${deviceId}`, { method: 'DELETE' });
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
        await loadAdminOverview();
        await loadAdminDevices();
      } catch (err) {
        alert(err.message || 'ลบกล่องยาไม่สำเร็จ');
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

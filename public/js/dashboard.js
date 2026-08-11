document.addEventListener('DOMContentLoaded', async () => {
  const user = API.getUser();
  if (!user && !API.getToken()) {
    window.location.href = '/login.html';
    return;
  }

  const userDisplayName = document.getElementById('userDisplayName');
  if (userDisplayName && user) {
    userDisplayName.innerText = user.full_name || user.username;
  }

  // Load Devices on page load and setup auto refresh (every 10s)
  await loadDashboardDevices();
  setInterval(loadDashboardDevices, 10000);
});

async function loadDashboardDevices() {
  const deviceContainer = document.getElementById('deviceContainer');
  const emptyState = document.getElementById('emptyState');
  if (!deviceContainer) return;

  try {
    const res = await API.request('/api/devices');
    const devices = res.data;

    if (!devices || devices.length === 0) {
      deviceContainer.innerHTML = '';
      if (emptyState) emptyState.classList.remove('d-none');
      return;
    }

    if (emptyState) emptyState.classList.add('d-none');

    deviceContainer.innerHTML = devices.map(d => {
      const isOnline = d.status === 'Online';
      const statusBadge = isOnline 
        ? `<span class="badge-online"><i class="bi bi-wifi"></i> ออนไลน์</span>`
        : `<span class="badge-offline"><i class="bi bi-wifi-off"></i> ออฟไลน์</span>`;

      // Battery color logic
      let batteryColorClass = 'text-success';
      if (d.battery_level <= 20) batteryColorClass = 'text-danger';
      else if (d.battery_level <= 50) batteryColorClass = 'text-warning';

      const lastSeenText = d.last_seen ? new Date(d.last_seen).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : 'ยังไม่มีข้อมูล';

      const scheduleList = (d.schedules || []).length > 0
        ? d.schedules.map(s => {
            const timeStr = s.time_slot ? s.time_slot.substring(0, 5) : '??:??';
            const repeats = s.repeat_count != null ? `${s.repeat_count} รอบ` : '-';
            return `<div class="d-flex justify-content-between align-items-center py-1 border-bottom">
                      <span class="text-dark">${timeStr}</span>
                      <small class="text-muted">${repeats}</small>
                    </div>`;
          }).join('')
        : '<div class="text-center text-muted py-2">ยังไม่ตั้งค่า</div>';

      return `
        <div class="col-md-6 col-lg-4 mb-4">
          <div class="card card-custom h-100 p-3">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <div class="d-flex align-items-center gap-2">
                <span class="fw-bold fs-5">${escapeHtml(d.box_name)}</span>
                <span class="badge bg-light text-dark border">${escapeHtml(d.location)}</span>
              </div>
              <div class="d-flex gap-2 align-items-center">
                ${statusBadge}
                <span class="badge-battery ${batteryColorClass} fw-bold">
                  <i class="bi bi-battery-charging"></i> ${d.battery_level}%
                </span>
              </div>
            </div>

            <div class="d-flex gap-3 align-items-center mb-3 p-2 bg-light rounded-3">
              <img src="${d.medicine_image || '/uploads/default_medicine.png'}" 
                   alt="${escapeHtml(d.medicine_name)}" 
                   class="rounded-3" 
                   style="width: 70px; height: 70px; object-fit: cover; border: 1px solid #E2E8F0;">
              <div>
                <h6 class="mb-1 text-primary fw-bold">${escapeHtml(d.medicine_name)}</h6>
                <small class="text-muted d-block"><i class="bi bi-qr-code"></i> Serial: <code>${escapeHtml(d.device_code)}</code></small>
                <small class="text-muted d-block"><i class="bi bi-cpu"></i> Firmware: ${escapeHtml(d.firmware_version)}</small>
              </div>
            </div>

            <div class="mb-3 py-2 border-top border-bottom">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <small class="text-muted">เวลาที่ตั้งไว้</small>
                <small class="text-muted">จำนวนรอบ</small>
              </div>
              ${scheduleList}
            </div>

            <div class="d-flex justify-content-between align-items-center mt-3 pt-2">
              <small class="text-muted"><i class="bi bi-clock-history"></i> ${lastSeenText}</small>
              <div class="d-flex gap-2">
                <a href="/edit-box.html?id=${d.box_id}" class="btn btn-sm btn-outline-custom">
                  <i class="bi bi-pencil-square"></i> แก้ไข
                </a>
                <button class="btn btn-sm btn-outline-danger" onclick="confirmDeleteDevice(${d.box_id}, '${escapeHtml(d.box_name)}')">
                  <i class="bi bi-trash"></i> ลบ
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load devices:', err);
  }
}

async function confirmDeleteDevice(boxId, boxName) {
  if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบกล่องยา "${boxName}" ออกจากระบบ?`)) {
    try {
      await API.request(`/api/devices/${boxId}`, { method: 'DELETE' });
      await loadDashboardDevices();
    } catch (err) {
      alert(err.message);
    }
  }
}

function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}

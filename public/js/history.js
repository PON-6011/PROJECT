document.addEventListener('DOMContentLoaded', async () => {
  const boxFilter = document.getElementById('boxFilter');
  const daysFilter = document.getElementById('daysFilter');

  await populateBoxFilter();
  await loadHistoryTable();

  if (boxFilter) boxFilter.addEventListener('change', loadHistoryTable);
  if (daysFilter) daysFilter.addEventListener('change', loadHistoryTable);
});

async function populateBoxFilter() {
  const boxFilter = document.getElementById('boxFilter');
  if (!boxFilter) return;

  try {
    const res = await API.request('/api/devices');
    const devices = res.data;
    
    boxFilter.innerHTML = '<option value="">ทั้งหมดทุกกล่องยา</option>' + 
      devices.map(d => `<option value="${d.box_id}">${escapeHtml(d.box_name)} (${escapeHtml(d.location)})</option>`).join('');
  } catch (err) {
    console.error('Failed to load boxes for filter:', err);
  }
}

async function loadHistoryTable() {
  const historyTableBody = document.getElementById('historyTableBody');
  const emptyHistory = document.getElementById('emptyHistory');
  if (!historyTableBody) return;

  const boxId = document.getElementById('boxFilter') ? document.getElementById('boxFilter').value : '';
  const days = document.getElementById('daysFilter') ? document.getElementById('daysFilter').value : '';

  let query = '/api/history?';
  if (boxId) query += `box_id=${boxId}&`;
  if (days) query += `days=${days}&`;

  try {
    const res = await API.request(query);
    const logs = res.data;

    if (!logs || logs.length === 0) {
      historyTableBody.innerHTML = '';
      if (emptyHistory) emptyHistory.classList.remove('d-none');
      return;
    }

    if (emptyHistory) emptyHistory.classList.add('d-none');

    historyTableBody.innerHTML = logs.map(log => {
      const takenDate = new Date(log.taken_time || log.created_at);
      const dateStr = takenDate.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
      const timeStr = takenDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';

      // Scheduled time display
      let scheduledTimeDisplay = '-';
      if (log.scheduled_time) {
        const schedDate = new Date(log.scheduled_time);
        if (!isNaN(schedDate.getTime())) {
          scheduledTimeDisplay = schedDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
        } else if (typeof log.scheduled_time === 'string' && log.scheduled_time.includes(':')) {
          scheduledTimeDisplay = log.scheduled_time.substring(0, 5) + ' น.';
        }
      } else if (log.schedule_time_slot) {
        scheduledTimeDisplay = log.schedule_time_slot.substring(0, 5) + ' น.';
      }

      let statusBadge = '';
      if (log.status === 'Taken' || log.status === 'ทานแล้ว' || log.status === 'ทานยาแล้ว') {
        statusBadge = '<span class="badge bg-success py-2 px-3"><i class="bi bi-check-circle-fill me-1"></i> ทานยาแล้ว</span>';
      } else if (log.status === 'Taken Early' || log.status === 'ทานก่อนเวลา' || log.status === 'ทานยาก่อนเวลา') {
        statusBadge = '<span class="badge bg-primary py-2 px-3"><i class="bi bi-clock-history me-1"></i> ทานยาก่อนเวลา</span>';
      } else {
        statusBadge = '<span class="badge bg-danger py-2 px-3"><i class="bi bi-exclamation-triangle-fill me-1"></i> ยังไม่ได้รับประทานยา</span>';
      }

      return `
        <tr>
          <td class="fw-bold">${dateStr}</td>
          <td><span class="badge bg-light text-dark border"><i class="bi bi-alarm text-primary me-1"></i>${scheduledTimeDisplay}</span></td>
          <td>${timeStr}</td>
          <td><span class="badge bg-light text-dark border">${escapeHtml(log.box_name)}</span></td>
          <td class="text-primary fw-medium">${escapeHtml(log.medicine_name)}</td>
          <td>${statusBadge}</td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    console.error('Failed to load history:', err);
  }
}

function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}

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
      const takenDate = new Date(log.taken_time);
      const dateStr = takenDate.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
      const timeStr = takenDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';

      let statusBadge = '';
      if (log.status === 'Taken' || log.status === 'ทานแล้ว') {
        statusBadge = '<span class="badge bg-success"><i class="bi bi-check-circle"></i> ทานแล้ว</span>';
      } else if (log.status === 'Taken Early' || log.status === 'ทานก่อนเวลา') {
        statusBadge = '<span class="badge bg-primary"><i class="bi bi-clock-history"></i> ทานก่อนเวลา</span>';
      } else {
        statusBadge = '<span class="badge bg-danger"><i class="bi bi-x-circle"></i> ลืมทาน</span>';
      }

      return `
        <tr>
          <td class="fw-bold">${dateStr}</td>
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

document.addEventListener('DOMContentLoaded', async () => {
  const boxFilter = document.getElementById('boxFilter');
  const statusFilter = document.getElementById('statusFilter');

  await populateBoxFilter();
  await loadHistoryTable();

  if (boxFilter) boxFilter.addEventListener('change', loadHistoryTable);
  if (statusFilter) statusFilter.addEventListener('change', loadHistoryTable);
});

async function populateBoxFilter() {
  const boxFilter = document.getElementById('boxFilter');
  if (!boxFilter) return;

  try {
    const res = await API.request('/api/devices');
    const devices = res.data;
    
    boxFilter.innerHTML = '<option value="">ทั้งหมดทุกกล่องยา</option>' + 
      devices.map(d => `<option value="${d.box_id}">${escapeHtml(d.box_name)} (${escapeHtml(d.location || '-')})</option>`).join('');
  } catch (err) {
    console.error('Failed to load boxes for filter:', err);
  }
}

async function loadHistoryTable() {
  const historyTableBody = document.getElementById('historyTableBody');
  const emptyHistory = document.getElementById('emptyHistory');
  if (!historyTableBody) return;

  const boxId = document.getElementById('boxFilter') ? document.getElementById('boxFilter').value : '';
  const statusVal = document.getElementById('statusFilter') ? document.getElementById('statusFilter').value : '';

  let query = '/api/history?';
  if (boxId) query += `box_id=${encodeURIComponent(boxId)}&`;
  if (statusVal) query += `status=${encodeURIComponent(statusVal)}&`;

  try {
    const res = await API.request(query);
    const logs = [...(res.data || [])].sort((a, b) => {
      const aTime = new Date(a.taken_time || a.created_at || a.scheduled_time || 0).getTime();
      const bTime = new Date(b.taken_time || b.created_at || b.scheduled_time || 0).getTime();
      return bTime - aTime;
    });

    if (!logs || logs.length === 0) {
      historyTableBody.innerHTML = '';
      if (emptyHistory) emptyHistory.classList.remove('d-none');
      return;
    }

    if (emptyHistory) emptyHistory.classList.add('d-none');

    historyTableBody.innerHTML = logs.map(log => {
      // 1. Date formatting: prefer actual intake time, then creation time, and only use schedule time as a fallback.
      const refDate = new Date(log.taken_time || log.created_at || log.scheduled_time || 0);
      const dateStr = !isNaN(refDate.getTime()) 
        ? refDate.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }) 
        : '-';

      // 2. Scheduled time display
      let scheduledTimeDisplay = '-';
      if (log.scheduled_time) {
        const schedDate = new Date(log.scheduled_time);
        if (!isNaN(schedDate.getTime())) {
          scheduledTimeDisplay = schedDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
        } else if (typeof log.scheduled_time === 'string' && log.scheduled_time.includes(':')) {
          const parts = log.scheduled_time.trim().split(' ');
          const timePart = parts.length > 1 ? parts[1] : parts[0];
          scheduledTimeDisplay = timePart.substring(0, 5) + ' น.';
        }
      } else if (log.schedule_time_slot) {
        scheduledTimeDisplay = log.schedule_time_slot.substring(0, 5) + ' น.';
      }

      // 3. Status and Taken time
      const statusRaw = (log.status || '').trim();
      const isMissed = (
        statusRaw === 'Missed' || 
        statusRaw === 'ยังไม่ได้รับประทานยา' || 
        statusRaw === 'ยังไม่รับประทานยา' || 
        statusRaw === 'ไม่ได้ทาน' || 
        statusRaw === 'ไม่ได้รับประทาน' ||
        statusRaw === 'ยังไม่ทาน'
      );

      let timeStr = '-';
      if (!isMissed) {
        const takenDate = log.taken_time ? new Date(log.taken_time) : (log.created_at ? new Date(log.created_at) : null);
        if (takenDate && !isNaN(takenDate.getTime())) {
          timeStr = takenDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
        }
      }

      let statusBadge = '';
      if (statusRaw === 'Taken' || statusRaw === 'ทานแล้ว' || statusRaw === 'ทานยาแล้ว' || statusRaw === 'รับประทานแล้ว') {
        statusBadge = '<span class="badge bg-success py-2 px-3"><i class="bi bi-check-circle-fill me-1"></i> ทานยาแล้ว</span>';
      } else if (statusRaw === 'Taken Early' || statusRaw === 'ทานก่อนเวลา' || statusRaw === 'ทานยาก่อนเวลา') {
        statusBadge = '<span class="badge bg-primary py-2 px-3"><i class="bi bi-clock-history me-1"></i> ทานยาก่อนเวลา</span>';
      } else if (isMissed) {
        statusBadge = '<span class="badge bg-danger py-2 px-3"><i class="bi bi-exclamation-triangle-fill me-1"></i> ยังไม่รับประทานยา</span>';
      } else {
        statusBadge = `<span class="badge bg-secondary py-2 px-3">${escapeHtml(statusRaw || 'ไม่ระบุ')}</span>`;
      }

      return `
        <tr>
          <td class="fw-bold">${dateStr}</td>
          <td><span class="badge bg-light text-dark border"><i class="bi bi-alarm text-primary me-1"></i>${scheduledTimeDisplay}</span></td>
          <td>${timeStr}</td>
          <td><span class="badge bg-light text-dark border">${escapeHtml(log.box_name || '-')}</span></td>
          <td class="text-primary fw-medium">${escapeHtml(log.medicine_name || '-')}</td>
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
  return String(text).replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}

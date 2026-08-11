async function renderDevices() {
  const container = document.getElementById('devicesList');
  container.innerHTML = '<p>กำลังโหลดข้อมูลอุปกรณ์...</p>';

  try {
    const devicesResp = await API.getMyDevices();
    const devices = devicesResp.data || devicesResp;
    if (!devices || devices.length === 0) {
      container.innerHTML = '<p>ยังไม่มีอุปกรณ์ที่ผูกกับบัญชีนี้</p>';
      return;
    }

    const rows = await Promise.all(devices.map(async (d) => {
      const scheduleResp = await API.getDeviceSchedule(d.device_code).catch(()=>({schedules:[]}));
      const schedules = scheduleResp.schedules || [];

      const schedHtml = schedules.map(s => `<li>${s.time} — ${s.meal_timing} (id:${s.schedule_id})</li>`).join('') || '<li>ไม่มีตาราง</li>';

      return `
        <div class="card mb-3">
          <div class="card-body">
            <h5 class="card-title">${d.box_name} <small class="text-muted">(${d.device_code})</small></h5>
            <p class="card-text">สถานะ: <strong>${d.status || d.online_status || 'Unknown'}</strong></p>
            <p class="card-text">แบตเตอรี่: ${d.battery_level || '-'}%</p>
            <p class="card-text">ตารางการเตือน:</p>
            <ul>${schedHtml}</ul>
          </div>
        </div>
      `;
    }));

    container.innerHTML = rows.join('\n');
  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger">เกิดข้อผิดพลาด: ${err.message}</div>`;
    console.error(err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderDevices();
});

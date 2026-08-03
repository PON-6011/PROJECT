document.addEventListener('DOMContentLoaded', () => {
  const verifyForm = document.getElementById('verifyDeviceForm');
  const alertBox = document.getElementById('alertBox');

  if (verifyForm) {
    verifyForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(verifyForm);
      alertBox.className = 'd-none';

      try {
        const res = await API.request('/api/devices/verify', {
          method: 'POST',
          body: formData
        });

        alertBox.className = 'alert alert-success mb-3';
        alertBox.innerHTML = `<i class="bi bi-check-circle-fill"></i> ผูกอุปกรณ์ <strong>${res.data.device_code}</strong> สำเร็จ! กำลังนำคุณไปยังหน้าตั้งค่าตารางยา...`;

        setTimeout(() => {
          window.location.href = `/edit-box.html?id=${res.data.box_id}`;
        }, 1500);
      } catch (err) {
        alertBox.className = 'alert alert-danger mb-3';
        alertBox.innerHTML = `<i class="bi bi-exclamation-triangle-fill"></i> ${err.message}`;
      }
    });
  }
});

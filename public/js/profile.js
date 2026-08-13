document.addEventListener('DOMContentLoaded', async () => {
  document.querySelectorAll('[data-toggle-password]').forEach((button) => {
    button.addEventListener('click', () => {
      const targetId = button.getAttribute('data-toggle-password');
      const input = document.getElementById(targetId);
      if (!input) return;

      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      const icon = button.querySelector('i');
      if (icon) {
        icon.className = isPassword ? 'bi bi-eye' : 'bi bi-eye-slash';
      }
    });
  });

  const profileForm = document.getElementById('profileForm');
  const alertBox = document.getElementById('alertBox');
  const logoutBtnProfile = document.getElementById('logoutBtnProfile');

  if (logoutBtnProfile) {
    logoutBtnProfile.addEventListener('click', () => {
      API.clearToken();
      const user = API.getUser();
      const role = user && user.role;
      window.location.href = role === 'admin' ? '/admin-dashboard.html' : '/dashboard.html';
    });
  }

  // Load User Data
  try {
    const res = await API.request('/api/auth/profile');
    const user = res.data;

    document.getElementById('full_name').value = user.full_name || '';
    document.getElementById('username').value = user.username || '';
    document.getElementById('email').value = user.email || '';
    document.getElementById('role_badge').innerText = user.role === 'admin' ? 'ผู้ดูแลระบบ (Admin)' : 'ผู้ดูแลผู้ป่วย (Caregiver)';
  } catch (err) {
    console.error('Failed to load profile:', err);
  }

  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      alertBox.className = 'd-none';

      const full_name = document.getElementById('full_name').value.trim();
      const email = document.getElementById('email').value.trim();
      const new_password = document.getElementById('new_password').value;
      const confirm_password = document.getElementById('confirm_password').value;

      if (new_password && new_password !== confirm_password) {
        alertBox.className = 'alert alert-danger mb-3';
        alertBox.innerText = 'รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน';
        return;
      }

      const updatePayload = { full_name, email };
      if (new_password) {
        updatePayload.password = new_password;
      }

      try {
        const res = await API.request('/api/auth/profile', {
          method: 'PUT',
          body: JSON.stringify(updatePayload)
        });

        API.setUser(res.data);
        alertBox.className = 'alert alert-success mb-3';
        alertBox.innerHTML = '<i class="bi bi-check-circle-fill"></i> อัปเดตข้อมูลโปรไฟล์เรียบร้อยแล้ว';
        
        document.getElementById('new_password').value = '';
        document.getElementById('confirm_password').value = '';

      } catch (err) {
        alertBox.className = 'alert alert-danger mb-3';
        alertBox.innerText = err.message;
      }
    });
  }
});

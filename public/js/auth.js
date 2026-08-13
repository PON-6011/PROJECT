document.addEventListener('DOMContentLoaded', () => {
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

  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const logoutBtn = document.getElementById('logoutBtn');

  // Handle Login
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value;
      const alertBox = document.getElementById('alertBox');

      try {
        alertBox.className = 'd-none';
        const res = await API.request('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ username, password })
        });

        API.setToken(res.data.token);
        API.setUser(res.data.user);

        // Redirect based on role
        if (res.data.user.role === 'admin') {
          window.location.href = '/admin-dashboard.html';
        } else {
          window.location.href = '/dashboard.html';
        }
      } catch (err) {
        alertBox.className = 'alert alert-danger mb-3';
        alertBox.innerText = err.message;
      }
    });
  }

  // Handle Register
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const full_name = document.getElementById('full_name').value.trim();
      const username = document.getElementById('username').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      const alertBox = document.getElementById('alertBox');

      if (password !== confirmPassword) {
        alertBox.className = 'alert alert-danger mb-3';
        alertBox.innerText = 'รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน';
        return;
      }

      try {
        alertBox.className = 'd-none';
        const res = await API.request('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ full_name, username, email, password })
        });

        API.setToken(res.data.token);
        API.setUser(res.data.user);
        window.location.href = '/dashboard.html';
      } catch (err) {
        alertBox.className = 'alert alert-danger mb-3';
        alertBox.innerText = err.message;
      }
    });
  }

  // Handle Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      API.clearToken();
      window.location.href = '/login.html';
    });
  }
});

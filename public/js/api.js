/**
 * Fetch API Client Helper with JWT Token Injection
 */
const API = {
  getToken() {
    return localStorage.getItem('medbox_jwt_token');
  },

  setToken(token) {
    localStorage.setItem('medbox_jwt_token', token);
  },

  clearToken() {
    localStorage.removeItem('medbox_jwt_token');
    localStorage.removeItem('medbox_user_info');
  },

  getUser() {
    const userStr = localStorage.getItem('medbox_user_info');
    return userStr ? JSON.parse(userStr) : null;
  },

  setUser(user) {
    localStorage.setItem('medbox_user_info', JSON.stringify(user));
  },

  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = options.headers || {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(endpoint, config);

      if (response.status === 401 || response.status === 403) {
        // Token expired or unauthenticated
        if (!window.location.pathname.endsWith('login.html') && !window.location.pathname.endsWith('register.html')) {
          this.clearToken();
          window.location.href = '/login.html';
          return;
        }
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์');
      }

      return data;
    } catch (err) {
      console.error('[API Error]:', err.message);
      throw err;
    }
  }
};

// ESP32 / Device related helpers
API.getMyDevices = async function() {
  return await this.request('/api/devices', { method: 'GET' });
};

API.getDeviceSchedule = async function(deviceCode) {
  const url = `/api/esp32/schedule?device_code=${encodeURIComponent(deviceCode)}`;
  return await this.request(url, { method: 'GET', headers: { 'x-device-code': deviceCode } });
};

API.sendIntakeLog = async function(deviceCode, body) {
  const url = '/api/esp32/intake';
  const headers = { 'x-device-code': deviceCode };
  return await this.request(url, { method: 'POST', headers, body: JSON.stringify(body) });
};

API.checkFirmware = async function(version) {
  const url = `/api/esp32/firmware/check?version=${encodeURIComponent(version)}`;
  return await this.request(url, { method: 'GET' });
};

API.getDeviceStatus = async function() {
  // Convenience: reuse getMyDevices and map status field
  const res = await this.getMyDevices();
  return res.data || res;
};

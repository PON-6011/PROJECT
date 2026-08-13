const authService = require('../src/services/authService');
const adminService = require('../src/services/adminService');
const userRepository = require('../src/repositories/userRepository');

(async () => {
  try {
    console.log('Creating test user...');
    const unique = Date.now();
    const { user, token } = await authService.register({
      username: `testadm_${unique}`,
      email: `testadm_${unique}@example.com`,
      full_name: 'Test Admin Disable',
      password: 'Password123!'
    }, '127.0.0.1');

    console.log('Created user id:', user.user_id || user.userId || user.id);
    const userId = user.user_id || user.userId || user.id;

    console.log('Admin disabling user...');
    // Use adminUserId = 1 for test (assumes admin exists)
    const result = await adminService.disableUser(1, userId, '127.0.0.1');
    console.log('Disable result:', result);

    // Try to login with credentials
    try {
      await authService.login(`testadm_${unique}`, 'Password123!', '127.0.0.1');
      console.error('FAIL: login succeeded after disable');
      process.exit(2);
    } catch (e) {
      console.log('Expected login failure:', e.message);
      console.log('PASS: user cannot login after disable');
      process.exit(0);
    }
  } catch (err) {
    console.error('Error during test:', err && err.message ? err.message : err);
    process.exit(3);
  }
})();

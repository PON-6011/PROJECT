const authService = require('../src/services/authService');
const userRepository = require('../src/repositories/userRepository');
const jwt = require('jsonwebtoken');
const env = require('../src/config/env');

(async () => {
  try {
    console.log('Creating test user...');
    const unique = Date.now();
    const { user, token } = await authService.register({
      username: `testdel_${unique}`,
      email: `testdel_${unique}@example.com`,
      full_name: 'Test Delete',
      password: 'Password123!'
    }, '127.0.0.1');

    console.log('Created user id:', user.user_id || user.userId || user.id);
    const payload = jwt.verify(token, env.jwt.secret);
    console.log('Token payload:', payload);

    // Delete the user
    const userId = payload.userId;
    console.log('Deleting user id:', userId);
    const deleted = await userRepository.deleteById(userId);
    console.log('Deleted result:', deleted);

    // Simulate middleware behavior: verify token then lookup DB
    try {
      const decoded = jwt.verify(token, env.jwt.secret);
      const dbUser = await userRepository.findById(decoded.userId);
      console.log('DB user after delete:', dbUser);
      if (!dbUser) {
        console.log('PASS: token invalidated by DB deletion (user not found)');
        process.exit(0);
      } else {
        console.log('FAIL: user still present after delete');
        process.exit(2);
      }
    } catch (e) {
      console.error('Token verify error:', e.message);
      process.exit(3);
    }
  } catch (err) {
    console.error('Error during test:', err && err.message ? err.message : err);
    process.exit(4);
  }
})();

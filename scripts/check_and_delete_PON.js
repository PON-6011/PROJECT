const userRepository = require('../src/repositories/userRepository');
const adminService = require('../src/services/adminService');

(async () => {
  try {
    const username = 'PON';
    console.log('Looking up user:', username);
    const user = await userRepository.findByUsernameOrEmail(username);
    if (!user) {
      console.log('User not found');
      process.exit(0);
    }

    console.log('Found user:', user);
    if (user.role === 'admin') {
      console.log('User is admin — will not delete via script.');
      process.exit(0);
    }

    console.log('Deleting user and their devices via adminService.disableUser...');
    const deleted = await adminService.disableUser(1, user.user_id, 'script');
    console.log('Delete result:', deleted);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();

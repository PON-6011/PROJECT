const adminService = require('../src/services/adminService');
const userRepository = require('../src/repositories/userRepository');

(async () => {
  try {
    const caregivers = await userRepository.findAllCaregivers();
    if (!caregivers || caregivers.length === 0) {
      console.log('No caregivers found to delete.');
      process.exit(0);
    }

    console.log(`Found ${caregivers.length} caregivers. Starting deletion...`);
    for (const u of caregivers) {
      try {
        const userId = u.user_id;
        console.log(`Deleting user id=${userId} username=${u.username} ...`);
        const res = await adminService.disableUser(1, userId, 'script');
        console.log(` -> deleted: ${res}`);
      } catch (e) {
        console.error(`Failed to delete user ${u.user_id} (${u.username}):`, e.message || e);
      }
    }

    console.log('Done deleting caregivers.');
    process.exit(0);
  } catch (err) {
    console.error('Error during deletion run:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();

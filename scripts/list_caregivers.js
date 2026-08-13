const userRepository = require('../src/repositories/userRepository');

(async () => {
  try {
    const caregivers = await userRepository.findAllCaregivers();
    console.log(`Found ${caregivers.length} caregivers.`);
    for (const u of caregivers) {
      console.log(`- id=${u.user_id} username=${u.username} email=${u.email} devices=${u.device_count}`);
    }
    process.exit(0);
  } catch (err) {
    console.error('Error listing caregivers:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();

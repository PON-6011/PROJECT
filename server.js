const app = require('./src/app');
const env = require('./src/config/env');
const { initDB } = require('./src/config/db');

const PORT = env.port || 3000;

async function startServer() {
  // Initialize Database Schema automatically
  await initDB();

  app.listen(PORT, () => {
    console.log('==========================================================');
    console.log('  IoT Medication Reminder Box System Server Started');
    console.log('==========================================================');
    console.log(`  Environment: ${env.nodeEnv}`);
    console.log(`  Server URL:  http://localhost:${PORT}`);
    console.log('==========================================================');
  });
}

startServer().catch(err => {
  console.error('Fatal Server Initialization Error:', err);
});

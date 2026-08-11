const app = require('./src/app');
const env = require('./src/config/env');
const { initDB } = require('./src/config/db');

const PORT = env.port || 3000;
const HOST = env.host || '0.0.0.0';

const os = require('os');
function getLocalIp() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

async function startServer() {
  // Initialize Database Schema automatically
  await initDB();

  app.listen(PORT, HOST, () => {
    console.log('==========================================================');
    console.log('  IoT Medication Reminder Box System Server Started');
    console.log('==========================================================');
    console.log(`  Environment: ${env.nodeEnv}`);
    const localIp = getLocalIp();
    console.log(`  Server Host:  ${HOST}`);
    console.log(`  Server URL:  http://${localIp}:${PORT}`);
    console.log('==========================================================');
  });
}

startServer().catch(err => {
  console.error('Fatal Server Initialization Error:', err);
});

const fs = require('fs');
const mysql = require('mysql2/promise');

const env = {};
const envPath = '.env';
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match) {
      env[match[1]] = match[2].replace(/^['\"]|['\"]$/g, '');
    }
  }
}

async function main() {
  const conn = await mysql.createConnection({
    host: env.DB_HOST || 'localhost',
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER || 'root',
    password: env.DB_PASSWORD || 'root',
    database: env.DB_NAME || 'medbox_db',
    charset: 'utf8mb4'
  });

  await conn.query('DELETE FROM medication_logs');
  await conn.query('ALTER TABLE medication_logs AUTO_INCREMENT = 1');
  console.log('CLEARED medication_logs');
  await conn.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

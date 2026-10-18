const fs = require('fs');
const mysql = require('mysql2/promise');

const env = {};
if (fs.existsSync('.env')) {
  for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
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

  const [rows] = await conn.query('SELECT COUNT(*) AS total FROM medication_logs');
  console.log(`medication_logs_count=${rows[0].total}`);
  await conn.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

const mysql = require('mysql2/promise');
const env = require('./env');

const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true
});

/**
 * Initialize Database schema automatically if tables do not exist
 */
async function initDB() {
  try {
    // 1. Connection test without DB to ensure MariaDB server is reachable
    const rootConn = await mysql.createConnection({
      host: env.db.host,
      port: env.db.port,
      user: env.db.user,
      password: env.db.password
    });
    
    await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${env.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await rootConn.end();

    // 2. Test Connection Pool
    const connection = await pool.getConnection();
    console.log(`[Database] Connected successfully to MariaDB/MySQL server at ${env.db.host}:${env.db.port}/${env.db.database}`);
    
    // Create Tables if not created
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`users\` (
        \`user_id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`username\` VARCHAR(50) NOT NULL UNIQUE,
        \`email\` VARCHAR(100) NOT NULL UNIQUE,
        \`password\` VARCHAR(255) NOT NULL,
        \`full_name\` VARCHAR(100) NOT NULL,
        \`role\` VARCHAR(20) NOT NULL DEFAULT 'caregiver',
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`devices\` (
        \`box_id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`device_code\` VARCHAR(50) NOT NULL UNIQUE,
        \`user_id\` INT NULL,
        \`box_name\` VARCHAR(100) NOT NULL DEFAULT 'กล่องยาของฉัน',
        \`location\` VARCHAR(100) DEFAULT 'ห้องนอน',
        \`medicine_name\` VARCHAR(100) DEFAULT 'พาราเซตามอล 500 mg',
        \`medicine_image\` VARCHAR(255) DEFAULT '/uploads/default_medicine.png',
        \`battery_level\` INT NOT NULL DEFAULT 100,
        \`status\` VARCHAR(20) NOT NULL DEFAULT 'Offline',
        \`firmware_version\` VARCHAR(20) NOT NULL DEFAULT 'v1.0.0',
        \`last_seen\` DATETIME NULL,
        \`schedule_version\` BIGINT NOT NULL DEFAULT 1,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`user_id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`schedules\` (
        \`schedule_id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`box_id\` INT NOT NULL,
        \`medicine_name\` VARCHAR(100) NOT NULL,
        \`time_slot\` TIME NOT NULL,
        \`meal_timing\` VARCHAR(20) NOT NULL DEFAULT 'before_meal',
        \`repeat_day\` VARCHAR(50) NOT NULL DEFAULT 'Everyday',
        \`repeat_count\` INT NOT NULL DEFAULT 3,
        \`repeat_interval_min\` INT NOT NULL DEFAULT 5,
        \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (\`box_id\`) REFERENCES \`devices\` (\`box_id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`medication_logs\` (
        \`log_id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`box_id\` INT NOT NULL,
        \`schedule_id\` INT NULL,
        \`medicine_name\` VARCHAR(100) NOT NULL,
        \`scheduled_time\` DATETIME NULL,
        \`taken_time\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`status\` VARCHAR(30) NOT NULL DEFAULT 'Taken',
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (\`box_id\`) REFERENCES \`devices\` (\`box_id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`battery_logs\` (
        \`log_id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`box_id\` INT NOT NULL,
        \`battery_level\` INT NOT NULL,
        \`recorded_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (\`box_id\`) REFERENCES \`devices\` (\`box_id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`audit_logs\` (
        \`audit_id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` INT NULL,
        \`action\` VARCHAR(50) NOT NULL,
        \`details\` TEXT NULL,
        \`ip_address\` VARCHAR(45) NULL,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`user_id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`firmware_versions\` (
        \`firmware_id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`version_number\` VARCHAR(20) NOT NULL UNIQUE,
        \`file_url\` VARCHAR(255) NOT NULL,
        \`checksum\` VARCHAR(64) NULL,
        \`description\` TEXT NULL,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    connection.release();
  } catch (err) {
    console.error('[Database Connection Warning]:', err.message);
    console.error('Make sure MariaDB is running. System will retry on incoming API requests.');
  }
}

module.exports = {
  pool,
  initDB
};

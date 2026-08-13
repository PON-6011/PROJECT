const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const parseOrigins = () => {
  const raw = process.env.CORS_ORIGIN || '*';
  return raw
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
};

module.exports = {
  port: Number(process.env.PORT) || 3000,
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'medbox_db'
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'medbox_super_secret_jwt_key_2026',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  corsOrigin: parseOrigins()
};

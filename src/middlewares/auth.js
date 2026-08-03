const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Middleware to verify JWT token in Authorization header
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'โปรดเข้าสู่ระบบก่อนใช้งาน (Missing Authorization Token)'
    });
  }

  jwt.verify(token, env.jwt.secret, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Token ไม่ถูกต้องหรือหมดอายุแล้ว โปรดเข้าสู่ระบบใหม่อีกครั้ง'
      });
    }
    req.user = user;
    next();
  });
}

/**
 * Middleware for Role authorization check
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'คุณไม่มีสิทธิ์ในการเข้าถึงการทำงานนี้'
      });
    }
    next();
  };
}

module.exports = {
  authenticateToken,
  requireRole
};

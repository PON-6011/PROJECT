const jwt = require('jsonwebtoken');
const env = require('../config/env');
const userRepository = require('../repositories/userRepository');

/**
 * Middleware to verify JWT token in Authorization header
 */
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'โปรดเข้าสู่ระบบก่อนใช้งาน (Missing Authorization Token)'
    });
  }

  jwt.verify(token, env.jwt.secret, async (err, payload) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Token ไม่ถูกต้องหรือหมดอายุแล้ว โปรดเข้าสู่ระบบใหม่อีกครั้ง'
      });
    }

    try {
      const dbUser = await userRepository.findById(payload.userId);
      if (!dbUser) {
        return res.status(401).json({
          success: false,
          message: 'ไม่พบผู้ใช้ในระบบ กรุณาลงทะเบียนใหม่'
        });
      }

      req.user = {
        userId: dbUser.user_id,
        username: dbUser.username,
        role: dbUser.role
      };
      next();
    } catch (e) {
      return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดระหว่างตรวจสอบผู้ใช้' });
    }
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

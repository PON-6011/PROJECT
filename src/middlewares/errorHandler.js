function errorHandler(err, req, res, next) {
  console.error('[Unhandled Error]:', err);

  let statusCode = err.statusCode || (err.isOperational ? 400 : 500);
  let message = err.message || 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์';

  // Handle DB Connection Errors cleanly
  if (err.code === 'ECONNREFUSED' || err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ER_ACCESS_DENIED_ERROR') {
    statusCode = 503;
    message = 'ไม่สามารถเชื่อมต่อฐานข้อมูล MariaDB/MySQL ได้ กรุณาตรวจสอบว่าเปิดบริการ MariaDB อยู่หรือไม่ (Database Service Offline)';
  }

  res.status(statusCode).json({
    success: false,
    message: message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
}

function notFoundHandler(req, res, next) {
  if (req.accepts('html')) {
    return res.status(404).sendFile(require('path').join(__dirname, '../../public/404.html'));
  }
  res.status(404).json({
    success: false,
    message: 'ไม่พบ Endpoint หรือทรัพยากรที่ร้องขอ (404 Not Found)'
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};

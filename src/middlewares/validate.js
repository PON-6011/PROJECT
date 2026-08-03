const { validationResult, body } = require('express-validator');

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'ข้อมูลที่ส่งมาไม่ถูกต้อง',
      errors: errors.array().map(err => ({ field: err.path, message: err.msg }))
    });
  }
  next();
}

const registerValidation = [
  body('username').trim().isLength({ min: 3 }).withMessage('ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร'),
  body('email').trim().isEmail().withMessage('รูปแบบอีเมลไม่ถูกต้อง'),
  body('password').isLength({ min: 6 }).withMessage('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'),
  body('full_name').trim().notEmpty().withMessage('กรุณาระบุชื่อ-นามสกุล'),
  handleValidationErrors
];

const loginValidation = [
  body('username').trim().notEmpty().withMessage('กรุณาระบุชื่อผู้ใช้หรืออีเมล'),
  body('password').notEmpty().withMessage('กรุณาระบุรหัสผ่าน'),
  handleValidationErrors
];

const devicePairValidation = [
  body('device_code').trim().notEmpty().withMessage('กรุณาระบุ Serial Number อุปกรณ์'),
  body('box_name').optional().trim(),
  body('location').optional().trim(),
  handleValidationErrors
];

const scheduleValidation = [
  body('box_id').isInt().withMessage('box_id ต้องเป็นตัวเลข'),
  body('medicine_name').trim().notEmpty().withMessage('กรุณาระบุชื่อยา'),
  body('schedules').isArray({ min: 1 }).withMessage('กรุณาตั้งเวลาอย่างน้อย 1 ช่วงเวลา'),
  handleValidationErrors
];

module.exports = {
  registerValidation,
  loginValidation,
  devicePairValidation,
  scheduleValidation
};

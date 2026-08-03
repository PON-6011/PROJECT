const authService = require('../services/authService');

class AuthController {
  async register(req, res, next) {
    try {
      const ipAddress = req.ip || req.connection.remoteAddress;
      const result = await authService.register(req.body, ipAddress);
      res.status(201).json({
        success: true,
        message: 'ลงทะเบียนผู้ใช้สำเร็จ',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async login(req, res, next) {
    try {
      const ipAddress = req.ip || req.connection.remoteAddress;
      const { username, password } = req.body;
      const result = await authService.login(username, password, ipAddress);
      res.status(200).json({
        success: true,
        message: 'เข้าสู่ระบบสำเร็จ',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async getProfile(req, res, next) {
    try {
      const userRepository = require('../repositories/userRepository');
      const user = await userRepository.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลผู้ใช้' });
      }
      res.status(200).json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const ipAddress = req.ip || req.connection.remoteAddress;
      const updatedUser = await authService.updateProfile(req.user.userId, req.body, ipAddress);
      res.status(200).json({
        success: true,
        message: 'อัปเดตข้อมูลโปรไฟล์เรียบร้อยแล้ว',
        data: updatedUser
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();

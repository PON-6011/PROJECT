const adminService = require('../services/adminService');

class AdminController {
  async getAllUsers(req, res, next) {
    try {
      const users = await adminService.getAllCaregivers();
      res.status(200).json({
        success: true,
        data: users
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteUser(req, res, next) {
    try {
      const ipAddress = req.ip || req.connection.remoteAddress;
      const targetUserId = parseInt(req.params.id, 10);

      await adminService.deleteUser(req.user.userId, targetUserId, ipAddress);
      res.status(200).json({
        success: true,
        message: 'ลบผู้ดูแลออกจากระบบเรียบร้อยแล้ว'
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AdminController();

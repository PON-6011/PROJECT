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

  async getOverview(req, res, next) {
    try {
      const data = await adminService.getDashboardOverview();
      res.status(200).json({
        success: true,
        data
      });
    } catch (err) {
      next(err);
    }
  }

  async getRecentHistory(req, res, next) {
    try {
      const logs = await adminService.getRecentHistory();
      res.status(200).json({
        success: true,
        data: logs
      });
    } catch (err) {
      next(err);
    }
  }

  async getAllDevices(req, res, next) {
    try {
      const devices = await adminService.getAllDevices();
      res.status(200).json({
        success: true,
        data: devices
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteUser(req, res, next) {
    try {
      const ipAddress = req.ip || req.connection.remoteAddress;
      const targetUserId = parseInt(req.params.id, 10);

      console.log('[AdminController] deleteUser request', {
        caller: req.user || null,
        targetUserId,
        ipAddress
      });

      await adminService.deleteUser(req.user.userId, targetUserId, ipAddress);
      res.status(200).json({
        success: true,
        message: 'ลบผู้ดูแลออกจากระบบเรียบร้อยแล้ว'
      });
    } catch (err) {
      console.error('[AdminController] deleteUser error', err && err.message ? err.message : err);
      // Send a clear JSON error to the client so frontend can show it
      const status = err && err.statusCode ? err.statusCode : 400;
      res.status(status).json({ success: false, message: err && err.message ? err.message : 'เกิดข้อผิดพลาดในการลบผู้ดูแล' });
    }
  }

  async deleteDevice(req, res, next) {
    try {
      const ipAddress = req.ip || req.connection.remoteAddress;
      const boxId = parseInt(req.params.id, 10);

      await adminService.deleteDevice(req.user.userId, boxId, ipAddress);
      res.status(200).json({
        success: true,
        message: 'ลบกล่องยาออกจากระบบเรียบร้อยแล้ว'
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AdminController();

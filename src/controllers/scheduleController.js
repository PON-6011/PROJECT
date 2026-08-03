const scheduleService = require('../services/scheduleService');

class ScheduleController {
  async getSchedules(req, res, next) {
    try {
      const boxId = parseInt(req.params.boxId, 10);
      const schedules = await scheduleService.getSchedulesByBox(boxId);
      res.status(200).json({
        success: true,
        data: schedules
      });
    } catch (err) {
      next(err);
    }
  }

  async saveSchedules(req, res, next) {
    try {
      const ipAddress = req.ip || req.connection.remoteAddress;
      const { box_id, medicine_name, schedules } = req.body;
      const result = await scheduleService.saveSchedules(
        req.user.userId,
        box_id,
        medicine_name,
        schedules,
        ipAddress
      );
      res.status(200).json({
        success: true,
        message: 'บันทึกตารางเวลาแจ้งเตือนเรียบร้อยแล้ว',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ScheduleController();

const historyService = require('../services/historyService');

class HistoryController {
  async getHistory(req, res, next) {
    try {
      const filters = {
        box_id: req.query.box_id ? parseInt(req.query.box_id, 10) : undefined,
        status: req.query.status ? req.query.status.trim() : undefined,
        days: req.query.days ? parseInt(req.query.days, 10) : undefined
      };
      const logs = await historyService.getUserHistory(req.user.userId, filters);
      res.status(200).json({
        success: true,
        data: logs
      });
    } catch (err) {
      next(err);
    }
  }

  async getBatteryLogs(req, res, next) {
    try {
      const boxId = parseInt(req.params.boxId, 10);
      const batteryLogs = await historyService.getBatteryHistory(boxId);
      res.status(200).json({
        success: true,
        data: batteryLogs
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new HistoryController();

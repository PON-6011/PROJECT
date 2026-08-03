const auditService = require('../services/auditService');

class AuditController {
  async getLogs(req, res, next) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
      const logs = await auditService.getAuditLogs(req.user.userId, limit);
      res.status(200).json({
        success: true,
        data: logs
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuditController();

const auditRepository = require('../repositories/auditRepository');

class AuditService {
  async getAuditLogs(userId, limit) {
    return await auditRepository.getLogs(userId, limit);
  }
}

module.exports = new AuditService();

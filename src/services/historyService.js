const historyRepository = require('../repositories/historyRepository');
const deviceRepository = require('../repositories/deviceRepository');

class HistoryService {
  async recordMedicationIntake(deviceCode, logData) {
    const device = await deviceRepository.findByCode(deviceCode);
    if (!device) {
      throw new Error('ไม่พบอุปกรณ์ที่มี Serial Number นี้');
    }

    const logId = await historyRepository.createLog({
      box_id: device.box_id,
      schedule_id: logData.schedule_id || null,
      medicine_name: logData.medicine_name || device.medicine_name,
      scheduled_time: logData.scheduled_time || null,
      taken_time: logData.taken_time || new Date(),
      status: logData.status || 'Taken' // 'Taken', 'Taken Early', 'Missed'
    });

    // Run auto-cleanup for logs older than 30 days
    historyRepository.cleanupExpiredLogs().catch(err => console.error('[Cleanup Error]:', err.message));

    return { success: true, log_id: logId };
  }

  async getUserHistory(userId, filters) {
    return await historyRepository.getLogsByUser(userId, filters);
  }

  async getBatteryHistory(boxId) {
    return await historyRepository.getBatteryHistory(boxId);
  }
}

module.exports = new HistoryService();

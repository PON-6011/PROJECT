const historyRepository = require('../repositories/historyRepository');
const deviceRepository = require('../repositories/deviceRepository');
const { pool } = require('../config/db');

class HistoryService {
  async recordMedicationIntake(deviceCode, logData) {
    const device = await deviceRepository.findByCode(deviceCode);
    if (!device) {
      throw new Error('ไม่พบอุปกรณ์ที่มี Serial Number นี้');
    }

    // Refresh device last_seen/online status
    await deviceRepository.updateHeartbeat(deviceCode);

    let scheduledTime = logData.scheduled_time || null;
    let scheduleId = logData.schedule_id ? parseInt(logData.schedule_id, 10) : null;

    if (scheduleId && scheduleId > 0 && !scheduledTime) {
      const [schedRows] = await pool.query(
        'SELECT time_slot, medicine_name FROM schedules WHERE schedule_id = ? LIMIT 1',
        [scheduleId]
      );
      if (schedRows.length > 0 && schedRows[0].time_slot) {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        scheduledTime = `${yyyy}-${mm}-${dd} ${schedRows[0].time_slot}`;
      }
    }

    const logId = await historyRepository.createLog({
      box_id: device.box_id,
      schedule_id: (scheduleId && scheduleId > 0) ? scheduleId : null,
      medicine_name: logData.medicine_name || device.medicine_name,
      scheduled_time: scheduledTime,
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

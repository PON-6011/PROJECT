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
    } else if (!scheduledTime) {
      // Find the closest active schedule for this box
      const [allScheds] = await pool.query(
        'SELECT schedule_id, time_slot, medicine_name FROM schedules WHERE box_id = ? AND is_active = 1 ORDER BY time_slot ASC',
        [device.box_id]
      );
      if (allScheds.length > 0) {
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        let closestSched = allScheds[0];
        let minDiff = 1440;
        for (const s of allScheds) {
          const parts = s.time_slot.split(':');
          const sMin = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
          const diff = Math.abs(currentMinutes - sMin);
          if (diff < minDiff) {
            minDiff = diff;
            closestSched = s;
          }
        }
        scheduleId = closestSched.schedule_id;
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        scheduledTime = `${yyyy}-${mm}-${dd} ${closestSched.time_slot}`;
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

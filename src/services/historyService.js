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

    const currentStatus = logData.status || 'Taken';

    // Requirement: Prevent duplicate intake logs for the same time / schedule today or within 60s
    let duplicateQuery = 'SELECT log_id FROM medication_logs WHERE box_id = ?';
    let dupParams = [device.box_id];

    if (scheduleId && scheduleId > 0 && (currentStatus === 'Taken' || currentStatus === 'Taken Early' || currentStatus === 'Missed')) {
      // Prevent repeated logs for the same schedule on the same day when it was already marked as taken / early / missed
      duplicateQuery += ` AND schedule_id = ? AND status IN ('Taken', 'Taken Early', 'Missed') AND DATE(taken_time) = CURDATE()`;
      dupParams.push(scheduleId);
    } else {
      // Otherwise check if a log was recorded within the last 60 seconds
      duplicateQuery += ` AND taken_time >= NOW() - INTERVAL 1 MINUTE`;
    }
    duplicateQuery += ` LIMIT 1`;

    const [dupRows] = await pool.query(duplicateQuery, dupParams);
    if (dupRows.length > 0) {
      console.log(`[History] Duplicate intake log ignored for box ${device.box_id} (schedule ${scheduleId}, status ${currentStatus})`);
      return { success: true, log_id: dupRows[0].log_id, duplicate: true };
    }

    const logId = await historyRepository.createLog({
      box_id: device.box_id,
      schedule_id: (scheduleId && scheduleId > 0) ? scheduleId : null,
      medicine_name: logData.medicine_name || device.medicine_name,
      scheduled_time: scheduledTime,
      taken_time: logData.taken_time || new Date(),
      status: currentStatus
    });

    // Requirement: Keep only the 100 most recent logs per box (per 1 device_code/box)
    await historyRepository.enforceMaxLogsPerBox(device.box_id, 100);

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

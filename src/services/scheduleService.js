const scheduleRepository = require('../repositories/scheduleRepository');
const deviceRepository = require('../repositories/deviceRepository');
const auditRepository = require('../repositories/auditRepository');

class ScheduleService {
  async getSchedulesByBox(boxId) {
    return await scheduleRepository.findByBoxId(boxId);
  }

  async saveSchedules(userId, boxId, medicineName, scheduleItems, ipAddress) {
    const device = await deviceRepository.findById(boxId);
    if (!device || device.user_id !== userId) {
      throw new Error('ไม่พบกล่องยา หรือคุณไม่มีสิทธิ์กำหนดตารางยานี้');
    }

    await scheduleRepository.replaceSchedules(boxId, medicineName, scheduleItems);
    
    // Update medicine_name on device table as well
    await deviceRepository.updateDevice(boxId, userId, { medicine_name: medicineName });

    // Update schedule_version so ESP32 re-downloads schedule
    const newVersion = await deviceRepository.incrementScheduleVersion(boxId);

    await auditRepository.logAction(userId, 'CHANGE_SCHEDULE', `อัปเดตตารางเวลาแจ้งเตือนสำหรับกล่องยา ID: ${boxId}`, ipAddress);

    return {
      box_id: boxId,
      medicine_name: medicineName,
      schedule_version: newVersion,
      schedules: await scheduleRepository.findByBoxId(boxId)
    };
  }

  /**
   * ESP32 downloads today's schedule
   */
  async getScheduleForESP32(deviceCode) {
    const device = await deviceRepository.findByCode(deviceCode);
    if (!device) {
      throw new Error('ไม่พบอุปกรณ์ที่มี Serial Number นี้');
    }

    const schedules = await scheduleRepository.findByBoxId(device.box_id);

    return {
      device_code: device.device_code,
      box_id: device.box_id,
      medicine_name: device.medicine_name,
      schedule_version: device.schedule_version,
      server_time: new Date().toISOString(),
      schedules: schedules.map(s => ({
        schedule_id: s.schedule_id,
        time: s.time_slot,
        meal_timing: s.meal_timing, // before_meal / after_meal
        repeat_day: s.repeat_day,
        repeat_count: s.repeat_count,
        repeat_interval_min: s.repeat_interval_min
      }))
    };
  }
}

module.exports = new ScheduleService();

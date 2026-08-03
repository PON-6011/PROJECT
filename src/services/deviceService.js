const deviceRepository = require('../repositories/deviceRepository');
const scheduleRepository = require('../repositories/scheduleRepository');
const auditRepository = require('../repositories/auditRepository');

class DeviceService {
  async getUserDevices(userId) {
    const devices = await deviceRepository.findByUserId(userId);
    const now = new Date();

    // Dynamically calculate Online/Offline status based on last_seen (threshold 90 seconds)
    return devices.map(d => {
      const isRecent = d.last_seen && (now - new Date(d.last_seen)) < 90000;
      return {
        ...d,
        status: isRecent ? 'Online' : 'Offline'
      };
    });
  }

  async verifyAndPairDevice(userId, deviceCode, boxName, location, medicineName, medicineImage, ipAddress) {
    const boxId = await deviceRepository.bindDevice(
      deviceCode,
      userId,
      boxName,
      location,
      medicineName,
      medicineImage
    );

    await auditRepository.logAction(userId, 'CREATE_DEVICE', `ผูกอุปกรณ์ Serial Number: ${deviceCode}`, ipAddress);
    return await deviceRepository.findById(boxId);
  }

  async updateDevice(userId, boxId, updateData, ipAddress) {
    const device = await deviceRepository.findById(boxId);
    if (!device || device.user_id !== userId) {
      throw new Error('ไม่พบกล่องยา หรือคุณไม่มีสิทธิ์แก้ไขกล่องยาลูกขอนี้');
    }

    await deviceRepository.updateDevice(boxId, userId, updateData);
    await auditRepository.logAction(userId, 'EDIT_DEVICE', `แก้ไขข้อมูลกล่องยา ID: ${boxId}`, ipAddress);

    return await deviceRepository.findById(boxId);
  }

  async deleteDevice(userId, boxId, ipAddress) {
    const device = await deviceRepository.findById(boxId);
    if (!device || device.user_id !== userId) {
      throw new Error('ไม่พบกล่องยา หรือคุณไม่มีสิทธิ์ลบกล่องยานี้');
    }

    await deviceRepository.deleteDevice(boxId, userId);
    await auditRepository.logAction(userId, 'DELETE_DEVICE', `ลบกล่องยา Serial: ${device.device_code}`, ipAddress);
    return true;
  }

  async handleHeartbeat(deviceCode, batteryLevel, firmwareVersion) {
    const device = await deviceRepository.updateHeartbeat(deviceCode, batteryLevel, firmwareVersion);
    if (!device) {
      throw new Error('ไม่พบอุปกรณ์ที่มี Serial Number นี้ในระบบ');
    }
    return {
      status: 'success',
      box_id: device.box_id,
      schedule_version: device.schedule_version,
      server_time: new Date().toISOString()
    };
  }
}

module.exports = new DeviceService();

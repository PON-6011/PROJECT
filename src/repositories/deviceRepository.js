const { pool } = require('../config/db');

class DeviceRepository {
  async findByCode(deviceCode) {
    const [rows] = await pool.query(
      'SELECT * FROM devices WHERE device_code = ? LIMIT 1',
      [deviceCode]
    );
    return rows[0] || null;
  }

  async findById(boxId) {
    const [rows] = await pool.query(
      'SELECT * FROM devices WHERE box_id = ? LIMIT 1',
      [boxId]
    );
    return rows[0] || null;
  }

  async findByUserId(userId) {
    const [rows] = await pool.query(
      `SELECT d.*, 
        COALESCE((SELECT SUM(s.repeat_count) FROM schedules s WHERE s.box_id = d.box_id AND s.is_active = 1), 0) AS reminder_count,
        (SELECT time_slot FROM schedules s WHERE s.box_id = d.box_id AND s.is_active = 1 ORDER BY ABS(TIMESTAMPDIFF(SECOND, TIME(NOW()), s.time_slot)) ASC LIMIT 1) AS next_reminder
       FROM devices d 
       WHERE d.user_id = ? 
       ORDER BY d.created_at DESC`,
      [userId]
    );
    return rows;
  }

  async findAllForAdmin() {
    const [rows] = await pool.query(
      `SELECT d.*, u.user_id AS owner_user_id, u.full_name AS caregiver_name, u.username AS caregiver_username,
              u.email AS caregiver_email
       FROM devices d
       LEFT JOIN users u ON u.user_id = d.user_id
       ORDER BY d.created_at DESC`
    );
    return rows;
  }

  async bindDevice(deviceCode, userId, boxName, location, medicineName, medicineImage) {
    // Check if device already exists in system database
    const existing = await this.findByCode(deviceCode);
    
    if (existing) {
      if (existing.user_id && existing.user_id !== userId) {
        throw new Error('อุปกรณ์นี้ถูกลงทะเบียนโดยผู้ใช้อื่นแล้ว ไม่สามารถผูกซ้ำได้');
      }
      
      // Update ownership and box details
      await pool.query(
        `UPDATE devices SET 
          user_id = ?, 
          box_name = COALESCE(?, box_name), 
          location = COALESCE(?, location), 
          medicine_name = COALESCE(?, medicine_name),
          medicine_image = COALESCE(?, medicine_image),
          status = 'Online',
          last_seen = NOW()
         WHERE device_code = ?`,
        [userId, boxName, location, medicineName, medicineImage, deviceCode]
      );
      return existing.box_id;
    } else {
      // Create new device record
      const [result] = await pool.query(
        `INSERT INTO devices (device_code, user_id, box_name, location, medicine_name, medicine_image, status, last_seen, schedule_version) 
         VALUES (?, ?, ?, ?, ?, ?, 'Online', NOW(), ?)`,
        [deviceCode, userId, boxName || 'กล่องยาของฉัน', location || 'ห้องนอน', medicineName || 'ยาประจำตัว', medicineImage || '/uploads/default_medicine.png', Date.now()]
      );
      return result.insertId;
    }
  }

  async updateDevice(boxId, userId, updateData) {
    const fields = [];
    const values = [];

    if (updateData.box_name) { fields.push('box_name = ?'); values.push(updateData.box_name); }
    if (updateData.location) { fields.push('location = ?'); values.push(updateData.location); }
    if (updateData.medicine_name) { fields.push('medicine_name = ?'); values.push(updateData.medicine_name); }
    if (updateData.medicine_image) { fields.push('medicine_image = ?'); values.push(updateData.medicine_image); }
    if (updateData.schedule_version) { fields.push('schedule_version = ?'); values.push(updateData.schedule_version); }

    if (fields.length === 0) return false;

    values.push(boxId, userId);
    const [result] = await pool.query(
      `UPDATE devices SET ${fields.join(', ')} WHERE box_id = ? AND user_id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  async updateHeartbeat(deviceCode, batteryLevel, firmwareVersion) {
    const now = new Date();
    const [result] = await pool.query(
      `UPDATE devices SET 
        battery_level = COALESCE(?, battery_level), 
        firmware_version = COALESCE(?, firmware_version),
        status = 'Online', 
        last_seen = NOW() 
       WHERE device_code = ?`,
      [batteryLevel, firmwareVersion, deviceCode]
    );

    // Get box_id to record battery log
    const device = await this.findByCode(deviceCode);
    if (device && batteryLevel !== undefined && batteryLevel !== null) {
      await pool.query(
        'INSERT INTO battery_logs (box_id, battery_level, recorded_at) VALUES (?, ?, NOW())',
        [device.box_id, batteryLevel]
      );
    }
    return device;
  }

  async deleteDevice(boxId, userId) {
    const [result] = await pool.query(
      'DELETE FROM devices WHERE box_id = ? AND user_id = ?',
      [boxId, userId]
    );
    return result.affectedRows > 0;
  }

  async deleteDeviceByAdmin(boxId) {
    const [result] = await pool.query(
      'DELETE FROM devices WHERE box_id = ?',
      [boxId]
    );
    return result.affectedRows > 0;
  }

  async unbindDevicesByUser(userId) {
    const [result] = await pool.query(
      'UPDATE devices SET user_id = NULL WHERE user_id = ?',
      [userId]
    );
    return result.affectedRows >= 0;
  }

  async deleteDevicesByUser(userId) {
    const [result] = await pool.query(
      'DELETE FROM devices WHERE user_id = ?',
      [userId]
    );
    return result.affectedRows >= 0;
  }

  async incrementScheduleVersion(boxId) {
    const newVersion = Date.now();
    await pool.query(
      'UPDATE devices SET schedule_version = ? WHERE box_id = ?',
      [newVersion, boxId]
    );
    return newVersion;
  }
}

module.exports = new DeviceRepository();

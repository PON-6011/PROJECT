const deviceService = require('../services/deviceService');
const scheduleService = require('../services/scheduleService');
const historyService = require('../services/historyService');
const { pool } = require('../config/db');

class ESP32Controller {
  /**
   * Heartbeat from ESP32 every 30 seconds
   * Header or body: device_code, battery_level, firmware_version
   */
  async heartbeat(req, res, next) {
    try {
      const deviceCode = req.headers['x-device-code'] || req.body.device_code;
      const { battery_level, firmware_version } = req.body;

      if (!deviceCode) {
        return res.status(400).json({ success: false, message: 'Missing device_code' });
      }

      const result = await deviceService.handleHeartbeat(deviceCode, battery_level, firmware_version);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get Schedule for ESP32
   */
  async getSchedule(req, res, next) {
    try {
      const deviceCode = req.headers['x-device-code'] || req.query.device_code;
      if (!deviceCode) {
        return res.status(400).json({ success: false, message: 'Missing device_code parameter' });
      }

      const scheduleData = await scheduleService.getScheduleForESP32(deviceCode);
      res.status(200).json(scheduleData);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Upload Intake Event (Taken / Taken Early)
   */
  async logIntake(req, res, next) {
    try {
      const deviceCode = req.headers['x-device-code'] || req.body.device_code;
      if (!deviceCode) {
        return res.status(400).json({ success: false, message: 'Missing device_code' });
      }

      const result = await historyService.recordMedicationIntake(deviceCode, req.body);
      res.status(200).json({
        success: true,
        message: 'บันทึกการรับประทานยาเรียบร้อยแล้ว',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Firmware OTA Check API placeholder
   */
  async checkFirmware(req, res, next) {
    try {
      const currentVersion = req.query.version || 'v1.0.0';
      const [rows] = await pool.query(
        'SELECT * FROM firmware_versions ORDER BY created_at DESC LIMIT 1'
      );

      if (rows.length > 0 && rows[0].version_number !== currentVersion) {
        return res.status(200).json({
          update_available: true,
          version: rows[0].version_number,
          url: rows[0].file_url,
          checksum: rows[0].checksum
        });
      }

      res.status(200).json({
        update_available: false,
        version: currentVersion,
        message: 'Firmware is up to date'
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ESP32Controller();

const deviceService = require('../services/deviceService');

class DeviceController {
  async getMyDevices(req, res, next) {
    try {
      const devices = await deviceService.getUserDevices(req.user.userId);
      res.status(200).json({
        success: true,
        data: devices
      });
    } catch (err) {
      next(err);
    }
  }

  async verifyAndPair(req, res, next) {
    try {
      const ipAddress = req.ip || req.connection.remoteAddress;
      const { device_code, box_name, location, medicine_name } = req.body;
      const medicine_image = req.file ? `/uploads/${req.file.filename}` : '/uploads/default_medicine.png';

      const device = await deviceService.verifyAndPairDevice(
        req.user.userId,
        device_code,
        box_name,
        location,
        medicine_name,
        medicine_image,
        ipAddress
      );

      res.status(201).json({
        success: true,
        message: 'ผูกอุปกรณ์กับบัญชีของคุณสำเร็จ',
        data: device
      });
    } catch (err) {
      next(err);
    }
  }

  async updateDevice(req, res, next) {
    try {
      const ipAddress = req.ip || req.connection.remoteAddress;
      const boxId = parseInt(req.params.id, 10);
      const updateData = { ...req.body };
      if (req.file) {
        updateData.medicine_image = `/uploads/${req.file.filename}`;
      }

      const updatedDevice = await deviceService.updateDevice(req.user.userId, boxId, updateData, ipAddress);
      res.status(200).json({
        success: true,
        message: 'อัปเดตข้อมูลกล่องยาเรียบร้อยแล้ว',
        data: updatedDevice
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteDevice(req, res, next) {
    try {
      const ipAddress = req.ip || req.connection.remoteAddress;
      const boxId = parseInt(req.params.id, 10);
      await deviceService.deleteDevice(req.user.userId, boxId, ipAddress);
      res.status(200).json({
        success: true,
        message: 'ลบกล่องยาเรียบร้อยแล้ว'
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new DeviceController();

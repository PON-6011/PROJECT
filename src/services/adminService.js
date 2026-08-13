const userRepository = require('../repositories/userRepository');
const deviceRepository = require('../repositories/deviceRepository');
const historyRepository = require('../repositories/historyRepository');
const auditRepository = require('../repositories/auditRepository');

class AdminService {
  async getAllCaregivers() {
    return await userRepository.findAllCaregivers();
  }

  async getDashboardOverview() {
    const users = await userRepository.findAllCaregivers();
    const recentLogs = await historyRepository.getRecentAdminLogs(12);

    const totalUsers = users.length;
    const totalBoxes = users.reduce((sum, user) => sum + Number(user.device_count || 0), 0);

    const currentMonth = new Date();
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const newThisMonth = users.filter((user) => {
      const createdAt = new Date(user.created_at);
      return createdAt >= startOfMonth;
    }).length;

    return {
      totalUsers,
      totalBoxes,
      newThisMonth,
      recentLogs,
      caregivers: users
    };
  }

  async getRecentHistory() {
    return await historyRepository.getRecentAdminLogs(25);
  }

  async getAllDevices() {
    return await deviceRepository.findAllForAdmin();
  }

  async deleteUser(adminUserId, targetUserId, ipAddress) {
    const targetUser = await userRepository.findById(targetUserId);
    if (!targetUser) {
      throw new Error('ไม่พบผู้ดูแลที่ต้องการลบ');
    }
    if (targetUser.role === 'admin') {
      throw new Error('ไม่สามารถลบบัญชีแอดมินได้');
    }

    const deleted = await userRepository.deleteById(targetUserId);
    if (!deleted) {
      throw new Error('ไม่สามารถลบผู้ดูแลได้ โปรดลองอีกครั้ง');
    }

    await auditRepository.logAction(adminUserId, 'DELETE_USER', `แอดมินลบผู้ดูแล: ${targetUser.username} (ID: ${targetUserId})`, ipAddress);
    return true;
  }

  async disableUser(adminUserId, targetUserId, ipAddress) {
    const targetUser = await userRepository.findById(targetUserId);
    if (!targetUser) {
      throw new Error('ไม่พบผู้ดูแลที่ต้องการลบ/ปิดใช้งาน');
    }
    if (targetUser.role === 'admin') {
      throw new Error('ไม่สามารถลบบัญชีแอดมินได้');
    }

    // Delete devices owned by the user
    await deviceRepository.deleteDevicesByUser(targetUserId);

    // Delete the user
    const deleted = await userRepository.deleteById(targetUserId);
    if (!deleted) {
      throw new Error('ไม่สามารถลบผู้ดูแลได้ โปรดลองอีกครั้ง');
    }

    await auditRepository.logAction(adminUserId, 'DISABLE_USER', `แอดมินลบผู้ดูแลและกล่องยาที่ผูกไว้: ${targetUser.username} (ID: ${targetUserId})`, ipAddress);
    return true;
  }

  async unbindUserDevices(adminUserId, targetUserId, ipAddress) {
    const targetUser = await userRepository.findById(targetUserId);
    if (!targetUser) {
      throw new Error('ไม่พบผู้ใช้งานที่ต้องการยกเลิกผูก');
    }

    const unbound = await deviceRepository.unbindDevicesByUser(targetUserId);
    if (!unbound) {
      throw new Error('ไม่สามารถยกเลิกการผูกกล่องยาได้ โปรดลองอีกครั้ง');
    }

    await auditRepository.logAction(adminUserId, 'UNBIND_DEVICES', `แอดมินยกเลิกผูกกล่องยาของ: ${targetUser.username} (ID: ${targetUserId})`, ipAddress);
    return true;
  }

  async deleteDevice(adminUserId, boxId, ipAddress) {
    const device = await deviceRepository.findById(boxId);
    if (!device) {
      throw new Error('ไม่พบกล่องยาที่ต้องการลบ');
    }

    const deleted = await deviceRepository.deleteDeviceByAdmin(boxId);
    if (!deleted) {
      throw new Error('ไม่สามารถลบกล่องยาได้ โปรดลองอีกครั้ง');
    }

    await auditRepository.logAction(
      adminUserId,
      'DELETE_DEVICE_ADMIN',
      `แอดมินลบกล่องยา: ${device.device_code} (${device.box_name}) โดยเจ้าของ: ${device.user_id || 'ไม่มีเจ้าของ'}`,
      ipAddress
    );

    return true;
  }
}

module.exports = new AdminService();

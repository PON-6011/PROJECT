const userRepository = require('../repositories/userRepository');
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
}

module.exports = new AdminService();

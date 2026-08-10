const userRepository = require('../repositories/userRepository');
const auditRepository = require('../repositories/auditRepository');

class AdminService {
  async getAllCaregivers() {
    return await userRepository.findAllCaregivers();
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

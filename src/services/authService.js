const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');
const auditRepository = require('../repositories/auditRepository');
const env = require('../config/env');

class AuthService {
  async register(userData, ipAddress) {
    const username = String(userData.username || '').trim();
    const email = String(userData.email || '').trim();

    const existing = await userRepository.findByUsernameOrEmail(username);
    if (existing) {
      throw new Error('ชื่อผู้ใช้นี้มีในระบบแล้ว กรุณาเลือกชื่ออื่น');
    }

    const existingEmail = await userRepository.findByUsernameOrEmail(email);
    if (existingEmail) {
      throw new Error('อีเมลนี้มีในระบบแล้ว กรุณาใช้อีเมลอื่น');
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const userId = await userRepository.create({
      ...userData,
      username,
      email,
      password: hashedPassword
    });

    await auditRepository.logAction(userId, 'REGISTER', `ลงทะเบียนผู้ใช้ใหม่: ${userData.username}`, ipAddress);

    const token = jwt.sign(
      { userId, username: userData.username, role: 'caregiver' },
      env.jwt.secret,
      { expiresIn: env.jwt.expiresIn }
    );

    const user = await userRepository.findById(userId);
    return { user, token };
  }

  async login(usernameOrEmail, password, ipAddress) {
    const user = await userRepository.findByUsernameOrEmail(usernameOrEmail);
    if (!user) {
      throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await auditRepository.logAction(user.user_id, 'LOGIN_FAILED', 'พยายามเข้าสู่ระบบแต่รหัสผ่านผิด', ipAddress);
      throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }

    await auditRepository.logAction(user.user_id, 'LOGIN', 'เข้าสู่ระบบสำเร็จ', ipAddress);

    const token = jwt.sign(
      { userId: user.user_id, username: user.username, role: user.role },
      env.jwt.secret,
      { expiresIn: env.jwt.expiresIn }
    );

    delete user.password;
    return { user, token };
  }

  async updateProfile(userId, updateData, ipAddress) {
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }
    await userRepository.updateProfile(userId, updateData);
    await auditRepository.logAction(userId, 'CHANGE_PROFILE', 'อัปเดตข้อมูลโปรไฟล์/รหัสผ่าน', ipAddress);

    const user = await userRepository.findById(userId);
    delete user.password;
    return user;
  }
}

module.exports = new AuthService();

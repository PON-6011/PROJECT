const { pool } = require('../config/db');

class UserRepository {
  async findByUsernameOrEmail(identifier) {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE username = ? OR email = ? LIMIT 1',
      [identifier, identifier]
    );
    return rows[0] || null;
  }

  async findById(userId) {
    const [rows] = await pool.query(
      'SELECT user_id, username, email, full_name, role, created_at, updated_at FROM users WHERE user_id = ? LIMIT 1',
      [userId]
    );
    return rows[0] || null;
  }

  async create(userData) {
    const { username, email, password, full_name, role = 'caregiver' } = userData;
    const [result] = await pool.query(
      'INSERT INTO users (username, email, password, full_name, role) VALUES (?, ?, ?, ?, ?)',
      [username, email, password, full_name, role]
    );
    return result.insertId;
  }

  async updateProfile(userId, updateData) {
    const fields = [];
    const values = [];

    if (updateData.full_name) {
      fields.push('full_name = ?');
      values.push(updateData.full_name);
    }
    if (updateData.email) {
      fields.push('email = ?');
      values.push(updateData.email);
    }
    if (updateData.password) {
      fields.push('password = ?');
      values.push(updateData.password);
    }

    if (fields.length === 0) return false;

    values.push(userId);
    const [result] = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE user_id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  async findAllCaregivers() {
    const [rows] = await pool.query(
      `SELECT u.user_id, u.username, u.email, u.full_name, u.role, u.created_at, u.updated_at,
              (SELECT COUNT(*) FROM devices d WHERE d.user_id = u.user_id) AS device_count
       FROM users u
       WHERE u.role = 'caregiver'
       ORDER BY u.created_at DESC`
    );
    return rows;
  }

  async deleteById(userId) {
    // Unbind devices first (SET user_id = NULL)
    await pool.query('UPDATE devices SET user_id = NULL WHERE user_id = ?', [userId]);
    // Delete the user
    const [result] = await pool.query('DELETE FROM users WHERE user_id = ? AND role = ?', [userId, 'caregiver']);
    return result.affectedRows > 0;
  }
}

module.exports = new UserRepository();

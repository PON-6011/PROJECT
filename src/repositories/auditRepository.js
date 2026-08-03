const { pool } = require('../config/db');

class AuditRepository {
  async logAction(userId, action, details = '', ipAddress = null) {
    try {
      await pool.query(
        'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)',
        [userId || null, action, typeof details === 'object' ? JSON.stringify(details) : details, ipAddress]
      );
    } catch (err) {
      console.error('[Audit Log Error]:', err.message);
    }
  }

  async getLogs(userId = null, limit = 50) {
    let sql = 'SELECT a.*, u.username, u.full_name FROM audit_logs a LEFT JOIN users u ON a.user_id = u.user_id';
    const params = [];

    if (userId) {
      sql += ' WHERE a.user_id = ?';
      params.push(userId);
    }

    sql += ' ORDER BY a.created_at DESC LIMIT ?';
    params.push(parseInt(limit, 10));

    const [rows] = await pool.query(sql, params);
    return rows;
  }
}

module.exports = new AuditRepository();

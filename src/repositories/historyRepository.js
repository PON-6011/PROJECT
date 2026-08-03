const { pool } = require('../config/db');

class HistoryRepository {
  async createLog(logData) {
    const { box_id, schedule_id, medicine_name, scheduled_time, taken_time, status } = logData;
    const [result] = await pool.query(
      `INSERT INTO medication_logs (box_id, schedule_id, medicine_name, scheduled_time, taken_time, status)
       VALUES (?, ?, ?, ?, COALESCE(?, NOW()), ?)`,
      [box_id, schedule_id || null, medicine_name, scheduled_time || null, taken_time || null, status || 'Taken']
    );
    return result.insertId;
  }

  async getLogsByUser(userId, filters = {}) {
    let sql = `
      SELECT l.*, d.box_name, d.location 
      FROM medication_logs l
      JOIN devices d ON l.box_id = d.box_id
      WHERE d.user_id = ?
    `;
    const params = [userId];

    if (filters.box_id) {
      sql += ' AND l.box_id = ?';
      params.push(filters.box_id);
    }
    if (filters.days) {
      sql += ' AND l.created_at >= NOW() - INTERVAL ? DAY';
      params.push(parseInt(filters.days, 10));
    }

    sql += ' ORDER BY l.taken_time DESC LIMIT 100';

    const [rows] = await pool.query(sql, params);
    return rows;
  }

  /**
   * Delete medication logs older than 30 days
   */
  async cleanupExpiredLogs() {
    const [result] = await pool.query(
      'DELETE FROM medication_logs WHERE created_at < NOW() - INTERVAL 30 DAY'
    );
    if (result.affectedRows > 0) {
      console.log(`[Maintenance] Cleaned up ${result.affectedRows} expired medication logs (>30 days old)`);
    }
    return result.affectedRows;
  }

  async getBatteryHistory(boxId) {
    const [rows] = await pool.query(
      'SELECT battery_level, recorded_at FROM battery_logs WHERE box_id = ? ORDER BY recorded_at DESC LIMIT 20',
      [boxId]
    );
    return rows;
  }
}

module.exports = new HistoryRepository();

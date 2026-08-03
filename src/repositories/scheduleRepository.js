const { pool } = require('../config/db');

class ScheduleRepository {
  async findByBoxId(boxId) {
    const [rows] = await pool.query(
      'SELECT * FROM schedules WHERE box_id = ? ORDER BY time_slot ASC',
      [boxId]
    );
    return rows;
  }

  async replaceSchedules(boxId, medicineName, scheduleItems) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Deactivate old schedules
      await connection.query('DELETE FROM schedules WHERE box_id = ?', [boxId]);

      // Insert new schedules
      for (const item of scheduleItems) {
        await connection.query(
          `INSERT INTO schedules (box_id, medicine_name, time_slot, meal_timing, repeat_day, repeat_count, repeat_interval_min, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
          [
            boxId,
            medicineName,
            item.time_slot,
            item.meal_timing || 'before_meal',
            item.repeat_day || 'Everyday',
            item.repeat_count || 3,
            item.repeat_interval_min || 5
          ]
        );
      }

      await connection.commit();
      return true;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  async deleteByBoxId(boxId) {
    const [result] = await pool.query('DELETE FROM schedules WHERE box_id = ?', [boxId]);
    return result.affectedRows > 0;
  }
}

module.exports = new ScheduleRepository();

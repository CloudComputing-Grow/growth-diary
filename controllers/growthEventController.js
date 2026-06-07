const db = require('../config/db');

const growthEventController = {
  handleUserDeleted: async (eventData) => {
    const userId = eventData.userId || eventData.user_id;
    if (!userId) return;

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query(
        'DELETE e FROM emotion e JOIN diary d ON e.diary_id = d.diary_id WHERE d.user_id = ?',
        [userId]
      );
      await connection.query('DELETE FROM diary WHERE user_id = ?', [userId]);
      await connection.query('DELETE FROM growth_rate WHERE user_id = ?', [userId]);
      await connection.query('DELETE FROM growth_status WHERE user_id = ?', [userId]);

      await connection.commit();
      console.log(`[RabbitMQ] 유저 ${userId}번 growth-diary 데이터 삭제 완료`);
    } catch (err) {
      await connection.rollback();
      console.error(`[RabbitMQ] 유저 ${userId}번 삭제 실패:`, err.message);
    } finally {
      connection.release();
    }
  },

  handleMissionCompleted: async (eventData) => {
    const { userId } = eventData;
    if (!userId) return;

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [rows] = await connection.query(
        `SELECT growth_status_id AS growthStatusId, growth_rate AS growthRate
         FROM growth_status
         WHERE user_id = ? AND is_harvested = false
         ORDER BY planted_at DESC LIMIT 1`,
        [userId]
      );

      if (rows.length === 0) {
        await connection.rollback();
        console.log(`[growth-diary] 유저 ${userId} 심어진 나무 없음 - 스킵`);
        return;
      }

      const { growthStatusId, growthRate } = rows[0];

      if (Number(growthRate) >= 100) {
        await connection.rollback();
        console.log(`[growth-diary] 유저 ${userId} 이미 최대 성장률 - 스킵`);
        return;
      }

      const newGrowthRate = Math.min(Number(growthRate) + 20, 100);
      const actualChangedRate = newGrowthRate - Number(growthRate);

      await connection.query(
        'UPDATE growth_status SET growth_rate = ? WHERE growth_status_id = ? AND user_id = ?',
        [newGrowthRate, growthStatusId, userId]
      );

      await connection.query(
        'INSERT INTO growth_rate (growth_status_id, user_id, changed_rate, reason) VALUES (?, ?, ?, ?)',
        [growthStatusId, userId, actualChangedRate, 'MISSION']
      );

      await connection.commit();
      console.log(`[growth-diary] 유저 ${userId} 미션 완료 → 성장률 +${actualChangedRate} (${newGrowthRate}%)`);
    } catch (err) {
      await connection.rollback();
      console.error(`[growth-diary] 유저 ${userId} 성장률 증가 실패:`, err.message);
    } finally {
      connection.release();
    }
  }
};

module.exports = growthEventController;
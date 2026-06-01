const db = require('../config/db');

// 현재 심어진 나무/성장 상태 조회
exports.getGarden = async (userId) => {
  const sql = `
    SELECT
      growth_status_id AS growthStatusId,
      user_id AS userId,
      item_type_id AS itemTypeId,
      level,
      growth_rate AS growthRate,
      is_harvested AS isHarvested,
      planted_at AS plantedAt,
      harvested_at AS harvestedAt
    FROM growth_status
    WHERE user_id = ?
      AND is_harvested = false
    ORDER BY planted_at DESC
    LIMIT 1
  `;

  const [rows] = await db.query(sql, [userId]);

  if (rows.length === 0) {
    return {
      hasPlanted: false,
      growthStatus: null,
    };
  }

  const growthStatus = rows[0];
  const growthStage = Math.floor(growthStatus.growthRate / 20);

  return {
    hasPlanted: true,
    growthStatus: {
      ...growthStatus,
      growthStage,
    },
  };
};

// 씨앗 심기
exports.plantSeed = async ({ userId, itemTypeId, level }) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [existing] = await connection.query(
      `
      SELECT growth_status_id
      FROM growth_status
      WHERE user_id = ?
        AND is_harvested = false
      ORDER BY planted_at DESC
      LIMIT 1
      `,
      [userId]
    );

    if (existing.length > 0) {
      await connection.rollback();
      return {
        status: 409,
        message: '이미 성장 중인 나무가 있습니다.',
      };
    }

    const [result] = await connection.query(
      `
      INSERT INTO growth_status
        (user_id, item_type_id, level, growth_rate, is_harvested)
      VALUES (?, ?, ?, 0, false)
      `,
      [userId, itemTypeId, level]
    );

    await connection.commit();

    return {
      status: 201,
      growthStatusId: result.insertId,
      userId: Number(userId),
      itemTypeId: Number(itemTypeId),
      level: Number(level),
      growthRate: 0,
      isHarvested: false,
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};
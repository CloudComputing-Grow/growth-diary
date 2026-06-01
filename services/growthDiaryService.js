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

// 성장률 증가 처리
exports.increaseGrowthRate = async ({ userId, growthStatusId, changedRate, reason }) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const allowedReasons = ['MISSION', 'FERTILIZER', 'SYSTEM'];

    if (!allowedReasons.includes(reason)) {
      await connection.rollback();
      return {
        status: 400,
        message: 'reason은 MISSION, FERTILIZER, SYSTEM 중 하나여야 합니다.',
      };
    }

    const [rows] = await connection.query(
      `
      SELECT
        growth_status_id AS growthStatusId,
        growth_rate AS growthRate,
        is_harvested AS isHarvested
      FROM growth_status
      WHERE growth_status_id = ?
        AND user_id = ?
      `,
      [growthStatusId, userId]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return { status: 404 };
    }

    const growthStatus = rows[0];

    if (growthStatus.isHarvested) {
      await connection.rollback();
      return {
        status: 400,
        message: '이미 수확된 성장 상태입니다.',
      };
    }

    const numericChangedRate = Number(changedRate);

    if (numericChangedRate <= 0) {
      await connection.rollback();
      return {
        status: 400,
        message: 'changedRate는 1 이상이어야 합니다.',
      };
    }

    // 성장률 초과
    if (Number(growthStatus.growthRate) >= 100) {
        await connection.rollback();
        return {
            status: 400,
            message: '이미 최대 성장률입니다.',
        };
    }

    const newGrowthRate = Math.min(
      Number(growthStatus.growthRate) + numericChangedRate,
      100
    );

    const actualChangedRate = newGrowthRate - Number(growthStatus.growthRate);

    await connection.query(
      `
      UPDATE growth_status
      SET growth_rate = ?
      WHERE growth_status_id = ?
        AND user_id = ?
      `,
      [newGrowthRate, growthStatusId, userId]
    );

    await connection.query(
      `
      INSERT INTO growth_rate
        (growth_status_id, user_id, changed_rate, reason)
      VALUES (?, ?, ?, ?)
      `,
      [growthStatusId, userId, actualChangedRate, reason]
    );

    await connection.commit();

    return {
      growthStatusId: Number(growthStatusId),
      userId: Number(userId),
      previousGrowthRate: Number(growthStatus.growthRate),
      changedRate: actualChangedRate,
      growthRate: newGrowthRate,
      reason,
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

// 성장률 변경 기록 조회
exports.getGrowthRateHistory = async ({ userId, growthStatusId }) => {
  const sql = `
    SELECT
      growth_rate_id AS growthRateId,
      growth_status_id AS growthStatusId,
      user_id AS userId,
      changed_rate AS changedRate,
      reason,
      created_at AS createdAt
    FROM growth_rate
    WHERE user_id = ?
      AND growth_status_id = ?
    ORDER BY created_at DESC
  `;

  const [rows] = await db.query(sql, [userId, growthStatusId]);
  return rows;
};

// 현재 성장 기반 미션 진행 상태 조회
exports.getProgress = async (userId) => {
  const sql = `
    SELECT
      growth_status_id AS growthStatusId,
      growth_rate AS growthRate
    FROM growth_status
    WHERE user_id = ?
      AND is_harvested = false
    ORDER BY planted_at DESC
    LIMIT 1
  `;

  const [rows] = await db.query(sql, [userId]);

  const growthStatusId = rows[0]?.growthStatusId || null;
  const growthRate = rows[0]?.growthRate || 0;

  const completedCount = Math.floor(growthRate / 20);
  const totalCount = 5;

  return {
    growthStatusId,
    growthRate,
    completedCount,
    totalCount,
  };
};
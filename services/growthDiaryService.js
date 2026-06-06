const db = require('../config/db');

const inventoryService = require('./external/inventoryService');
const achievementService = require('./external/achievementService');

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

// 일기 작성
exports.createDiary = async ({ userId, missionExecutionId, title, content, emotions }) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // 같은 missionExecutionId에 대해 한 번만 작성 가능하도록 체크
    const [existing] = await connection.query(
      `
      SELECT diary_id AS diaryId
      FROM diary
      WHERE user_id = ?
        AND mission_execution_id = ?
      `,
      [userId, missionExecutionId]
    );

    if (existing.length > 0) {
      await connection.rollback();
      return {
        status: 409,
        message: '이미 해당 미션에 대한 일기가 작성되었습니다.',
      };
    }

    const [result] = await connection.query(
      `
      INSERT INTO diary
        (user_id, mission_execution_id, title, content)
      VALUES (?, ?, ?, ?)
      `,
      [userId, missionExecutionId, title, content]
    );

    const diaryId = result.insertId;

    const emotionData = emotions.map((emotion) => [
      diaryId,
      emotion,
    ]);

    await connection.query(
      `
      INSERT INTO emotion
        (diary_id, emotion_tag_name)
      VALUES ?
      `,
      [emotionData]
    );

    await connection.commit();

    return {
      diaryId,
      userId: Number(userId),
      missionExecutionId: Number(missionExecutionId),
      title,
      content,
      emotions,
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

// 내 일기 목록 조회
exports.getDiaries = async (userId) => {
  const sql = `
    SELECT
      d.diary_id AS diaryId,
      d.user_id AS userId,
      d.mission_execution_id AS missionExecutionId,
      d.title,
      d.content,
      d.created_at AS createdAt,
      e.emotion_tag_name AS emotionTag
    FROM diary d
    LEFT JOIN emotion e ON d.diary_id = e.diary_id
    WHERE d.user_id = ?
    ORDER BY d.created_at DESC, e.emotion_id ASC
  `;

  const [rows] = await db.query(sql, [userId]);

  const diaryMap = new Map();

  rows.forEach((row) => {
    if (!diaryMap.has(row.diaryId)) {
      diaryMap.set(row.diaryId, {
        diaryId: row.diaryId,
        userId: row.userId,
        missionExecutionId: row.missionExecutionId,
        title: row.title,
        content: row.content,
        emotions: [],
        createdAt: row.createdAt,
      });
    }

    if (row.emotionTag) {
      diaryMap.get(row.diaryId).emotions.push(row.emotionTag);
    }
  });

  return Array.from(diaryMap.values());
};

// 일기 상세 조회
exports.getDiaryById = async ({ userId, diaryId }) => {
  const sql = `
    SELECT
      d.diary_id AS diaryId,
      d.user_id AS userId,
      d.mission_execution_id AS missionExecutionId,
      d.title,
      d.content,
      d.created_at AS createdAt,
      e.emotion_tag_name AS emotionTag
    FROM diary d
    LEFT JOIN emotion e ON d.diary_id = e.diary_id
    WHERE d.user_id = ?
      AND d.diary_id = ?
    ORDER BY e.emotion_id ASC
  `;

  const [rows] = await db.query(sql, [userId, diaryId]);

  if (rows.length === 0) {
    return null;
  }

  const diary = {
    diaryId: rows[0].diaryId,
    userId: rows[0].userId,
    missionExecutionId: rows[0].missionExecutionId,
    title: rows[0].title,
    content: rows[0].content,
    emotions: [],
    createdAt: rows[0].createdAt,
  };

  rows.forEach((row) => {
    if (row.emotionTag) {
      diary.emotions.push(row.emotionTag);
    }
  });

  return diary;
};

// 일기 작성 여부 확인
exports.checkDiary = async ({ userId, missionExecutionId }) => {
  const sql = `
    SELECT
      diary_id AS diaryId
    FROM diary
    WHERE user_id = ?
      AND mission_execution_id = ?
    LIMIT 1
  `;

  const [rows] = await db.query(sql, [userId, missionExecutionId]);

  if (rows.length === 0) {
    return {
      missionExecutionId: Number(missionExecutionId),
      hasDiary: false,
      canWrite: true,
      diaryId: null,
    };
  }

  return {
    missionExecutionId: Number(missionExecutionId),
    hasDiary: true,
    canWrite: false,
    diaryId: rows[0].diaryId,
  };
};

// 심은 과일 삭제/초기화
exports.clearPlantedFruit = async (userId) => {
  const sql = `
    DELETE FROM growth_status
    WHERE user_id = ?
      AND is_harvested = false
  `;

  const [result] = await db.query(sql, [userId]);

  return {
    userId: Number(userId),
    deletedCount: result.affectedRows,
  };
};

// 수확 처리
exports.harvest = async ({ userId, growthStatusId }) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    let sql = `
      SELECT
        growth_status_id AS growthStatusId,
        user_id AS userId,
        item_type_id AS itemTypeId,
        level,
        growth_rate AS growthRate,
        is_harvested AS isHarvested
      FROM growth_status
      WHERE user_id = ?
        AND is_harvested = false
    `;

    const params = [userId];

    if (growthStatusId) {
      sql += ` AND growth_status_id = ? `;
      params.push(growthStatusId);
    }

    sql += `
      ORDER BY planted_at DESC
      LIMIT 1
    `;

    const [rows] = await connection.query(sql, params);

    if (rows.length === 0) {
      await connection.rollback();
      return {
        status: 404,
        message: '수확 가능한 나무가 없습니다.',
      };
    }

    const growthStatus = rows[0];

    if (Number(growthStatus.growthRate) < 100) {
      await connection.rollback();
      return {
        status: 400,
        message: '성장률이 100%가 되어야 수확할 수 있습니다.',
      };
    }

    await connection.query(
      `
      UPDATE growth_status
      SET is_harvested = true,
          harvested_at = NOW()
      WHERE growth_status_id = ?
        AND user_id = ?
      `,
      [growthStatus.growthStatusId, userId]
    );

    await connection.commit();

    const itemTypeId = Number(growthStatus.itemTypeId);

    // Inventory item_type_id 매핑 기준:
    // 2 = 일반 사과, 3 = 황금 사과
    // 4 = 일반 체리, 5 = 황금 체리 ...
    const normalItemTypeId = itemTypeId % 2 === 0 ? itemTypeId : itemTypeId - 1;
    const goldItemTypeId = normalItemTypeId + 1;

    const externalResults = {
      inventory: {
        normalReward: null,
        goldReward: null,
      },
      achievement: {
        normal: null,
        gold: null,
      },
    };

    // Inventory: 일반 과일 2개 지급
    try {
      externalResults.inventory.normalReward = await inventoryService.rewardItem({
        userId,
        itemTypeId: normalItemTypeId,
        qty: 2,
      });
    } catch (err) {
      console.error('Inventory 일반 과일 지급 실패:', err.message);
      externalResults.inventory.normalReward = {
        success: false,
        message: err.message,
      };
    }

    // Inventory: 황금 과일 1개 지급
    try {
      externalResults.inventory.goldReward = await inventoryService.rewardItem({
        userId,
        itemTypeId: goldItemTypeId,
        qty: 1,
      });
    } catch (err) {
      console.error('Inventory 황금 과일 지급 실패:', err.message);
      externalResults.inventory.goldReward = {
        success: false,
        message: err.message,
      };
    }

    // Achievement: 일반 과일 도감 등록
    try {
      externalResults.achievement.normal =
        await achievementService.updateCollectionByHarvest({
          userId,
          itemTypeId: normalItemTypeId,
        });
    } catch (err) {
      console.error('Achievement 일반 과일 도감 등록 실패:', err.message);
      externalResults.achievement.normal = {
        success: false,
        message: err.message,
      };
    }

    // Achievement: 황금 과일 도감 등록
    try {
      externalResults.achievement.gold =
        await achievementService.updateCollectionByHarvest({
          userId,
          itemTypeId: goldItemTypeId,
        });
    } catch (err) {
      console.error('Achievement 황금 과일 도감 등록 실패:', err.message);
      externalResults.achievement.gold = {
        success: false,
        message: err.message,
      };
    }

    return {
      status: 200,
      growthStatusId: Number(growthStatus.growthStatusId),
      userId: Number(userId),
      itemTypeId,
      normalItemTypeId,
      goldItemTypeId,
      growthRate: Number(growthStatus.growthRate),
      isHarvested: true,
      rewards: {
        normalQty: 2,
        goldQty: 1,
      },
      externalResults,
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

// 내부 API용 씨앗 심기 (inventory에서 이미 차감 완료 후 호출)
exports.plantSeedInternal = async ({ userId, itemTypeId, level }) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [existing] = await connection.query(
      `SELECT growth_status_id FROM growth_status
       WHERE user_id = ? AND is_harvested = false LIMIT 1`,
      [userId]
    );

    if (existing.length > 0) {
      await connection.rollback();
      return { status: 409, message: '이미 성장 중인 나무가 있습니다.' };
    }

    const [result] = await connection.query(
      `INSERT INTO growth_status (user_id, item_type_id, level, growth_rate, is_harvested)
       VALUES (?, ?, ?, 0, false)`,
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
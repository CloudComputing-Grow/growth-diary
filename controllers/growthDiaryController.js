const growthDiaryService = require('../services/growthDiaryService');

// 현재 정원/성장 상태 조회
exports.getGarden = async (req, res) => {
  try {
    const userId = req.userId;
    console.log(`[getGarden] userId: ${userId}`); 
    const garden = await growthDiaryService.getGarden(userId);
    console.log(`[getGarden] result:`, JSON.stringify(garden));
    return res.json({
      success: true,
      data: garden,
    });
  } catch (err) {
    console.error(`[getGarden] error:`, err.message);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// 씨앗 심기
exports.plantSeed = async (req, res) => {
  try {
    const userId = req.userId;
    const { itemTypeId, level } = req.body;
    console.log(`[plantSeed] userId: ${userId}, itemTypeId: ${itemTypeId}, level: ${level}`);

    if (!itemTypeId || !level) {
      return res.status(400).json({
        success: false,
        message: 'itemTypeId, level은 필수입니다.',
      });
    }

    const result = await growthDiaryService.plantSeed({
      userId,
      itemTypeId,
      level,
    });
    console.log(`[plantSeed] result:`, JSON.stringify(result));

    if (result.status === 409) {
      return res.status(409).json({
        success: false,
        message: result.message,
      });
    }

    if (result.status === 400) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    return res.status(201).json({
      success: true,
      message: '씨앗이 심어졌습니다.',
      data: result,
    });
  } catch (err) {
    console.error(`[plantSeed] error:`, err.message);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// 수확 처리
exports.harvest = async (req, res) => {
  try {
    const userId = req.userId;
    const { growthStatusId } = req.body;
    console.log(`[harvest] userId: ${userId}, growthStatusId: ${growthStatusId}`);

    const result = await growthDiaryService.harvest({
      userId,
      growthStatusId,
    });
    console.log(`[harvest] result status:`, result.status);

    if (result.status === 404 || result.status === 400) {
      return res.status(result.status).json({
        success: false,
        message: result.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: '수확 처리가 완료되었습니다.',
      data: result,
    });
  } catch (err) {
    console.error(`[harvest] error:`, err.message);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// 성장률 증가 처리
exports.increaseGrowthRate = async (req, res) => {
  try {
    const userId = req.userId;
    const { growthStatusId, changedRate, reason } = req.body;
    console.log(`[increaseGrowthRate] userId: ${userId}, growthStatusId: ${growthStatusId}, changedRate: ${changedRate}, reason: ${reason}`);

    if (!growthStatusId || !changedRate || !reason) {
      return res.status(400).json({
        success: false,
        message: 'growthStatusId, changedRate, reason은 필수입니다.',
      });
    }

    const result = await growthDiaryService.increaseGrowthRate({
      userId,
      growthStatusId,
      changedRate,
      reason,
    });
    console.log(`[increaseGrowthRate] result:`, JSON.stringify(result));

    if (result.status === 404) {
      return res.status(404).json({
        success: false,
        message: '성장 상태를 찾을 수 없습니다.',
      });
    }

    if (result.status === 400) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    return res.json({
      success: true,
      message: '성장률이 반영되었습니다.',
      data: result,
    });
  } catch (err) {
    console.error(`[increaseGrowthRate] error:`, err.message);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// 성장률 변경 기록 조회
exports.getGrowthRateHistory = async (req, res) => {
  try {
    const userId = req.userId;
    const { growthStatusId } = req.query;
    console.log(`[getGrowthRateHistory] userId: ${userId}, growthStatusId: ${growthStatusId}`);

    if (!growthStatusId) {
      return res.status(400).json({
        success: false,
        message: 'growthStatusId는 필수입니다.',
      });
    }

    const history = await growthDiaryService.getGrowthRateHistory({
      userId,
      growthStatusId,
    });

    return res.json({
      success: true,
      data: history,
    });
  } catch (err) {
    console.error(`[getGrowthRateHistory] error:`, err.message);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// 현재 성장 기반 미션 진행 상태 조회
exports.getProgress = async (req, res) => {
  try {
    const userId = req.userId;
    console.log(`[getProgress] userId: ${userId}`);
    const progress = await growthDiaryService.getProgress(userId);
    console.log(`[getProgress] result:`, JSON.stringify(progress));
    return res.json({
      success: true,
      data: progress,
    });
  } catch (err) {
    console.error(`[getProgress] error:`, err.message);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// 일기 작성
exports.createDiary = async (req, res) => {
  try {
    const userId = req.userId;
    const { missionExecutionId, title, content, emotions } = req.body;
    console.log(`[createDiary] userId: ${userId}, missionExecutionId: ${missionExecutionId}`);
    
    if (!missionExecutionId || !title || !content) {
      return res.status(400).json({
        success: false,
        message: 'missionExecutionId, title, content는 필수입니다.',
      });
    }

    if (!Array.isArray(emotions) || emotions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'emotions는 1개 이상 선택해야 합니다.',
      });
    }

    const result = await growthDiaryService.createDiary({
      userId,
      missionExecutionId,
      title,
      content,
      emotions,
    });
    console.log(`[createDiary] result:`, JSON.stringify(result));

    if (result.status === 409) {
      return res.status(409).json({
        success: false,
        message: result.message,
      });
    }
    
    return res.status(201).json({
      success: true,
      message: '일기가 작성되었습니다.',
      data: result,
    });
  } catch (err) {
    console.error(`[createDiary] error:`, err.message);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// 내 일기 목록 조회
exports.getDiaries = async (req, res) => {
  try {
    const userId = req.userId;
    console.log(`[getDiaries] userId: ${userId}`);
    const diaries = await growthDiaryService.getDiaries(userId);
    return res.json({
      success: true,
      data: diaries,
    });
  } catch (err) {
    console.error(`[getDiaries] error:`, err.message);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// 일기 상세 조회
exports.getDiaryById = async (req, res) => {
  try {
    const userId = req.userId;
    const { diaryId } = req.params;
    console.log(`[getDiaryById] userId: ${userId}, diaryId: ${diaryId}`);

    const diary = await growthDiaryService.getDiaryById({
      userId,
      diaryId,
    });

    if (!diary) {
      return res.status(404).json({
        success: false,
        message: '일기를 찾을 수 없습니다.',
      });
    }

    return res.json({
      success: true,
      data: diary,
    });
  } catch (err) {
    console.error(`[getDiaryById] error:`, err.message);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// 일기 작성 여부 확인
exports.checkDiary = async (req, res) => {
  try {
    const userId = req.userId;
    const { missionExecutionId } = req.query;
    console.log(`[checkDiary] userId: ${userId}, missionExecutionId: ${missionExecutionId}`);

    if (!missionExecutionId) {
      return res.status(400).json({
        success: false,
        message: 'missionExecutionId는 필수입니다.',
      });
    }

    const result = await growthDiaryService.checkDiary({
      userId,
      missionExecutionId,
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error(`[checkDiary] error:`, err.message);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// 내부 API: 성장률 증가 처리
exports.increaseGrowthRateInternal = async (req, res) => {
  try {
    const headerUserId = req.headers['x-user-id'];
    const { userId, growthStatusId, changedRate, reason } = req.body;
    const finalUserId = userId || headerUserId;
    console.log(`[increaseGrowthRateInternal] finalUserId: ${finalUserId}, growthStatusId: ${growthStatusId}`);

    if (!finalUserId || !growthStatusId || !changedRate || !reason) {
      return res.status(400).json({
        success: false,
        message: 'userId, growthStatusId, changedRate, reason은 필수입니다.',
      });
    }

    const result = await growthDiaryService.increaseGrowthRate({
      userId: finalUserId,
      growthStatusId,
      changedRate,
      reason,
    });

    if (result.status === 404) {
      return res.status(404).json({
        success: false,
        message: '성장 상태를 찾을 수 없습니다.',
      });
    }

    if (result.status === 400) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: '성장률이 반영되었습니다.',
      data: result,
    });
  } catch (err) {
    console.error(`[increaseGrowthRateInternal] error:`, err.message);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// 내부 API: 최신 나무 성장도 및 수확 상태 조회
exports.getLatestTreeInternal = async (req, res) => {
  try {
    const { userId } = req.query;
    console.log(`[getLatestTreeInternal] userId: ${userId}`);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId는 필수입니다.',
      });
    }

    const result = await growthDiaryService.getGarden(userId);

    if (!result.hasPlanted) {
      return res.status(200).json({
        growth_rate: 0,
        is_harvested: false,
      });
    }

    return res.status(200).json({
      growth_rate: result.growthStatus.growthRate,
      is_harvested: Boolean(result.growthStatus.isHarvested),
    });
  } catch (err) {
    console.error(`[getLatestTreeInternal] error:`, err.message);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// 내부 API: 유저 마당에 나무 심기
exports.plantFruitInternal = async (req, res) => {
  try {
    const { userId } = req.params;
    const { item_type_id, itemTypeId, level } = req.body;
    const finalItemTypeId = itemTypeId || item_type_id;
    const finalLevel = level || 1;
    console.log(`[plantFruitInternal] userId: ${userId}, itemTypeId: ${finalItemTypeId}, level: ${finalLevel}`);

    if (!userId || !finalItemTypeId) {
      return res.status(400).json({
        success: false,
        message: 'userId, item_type_id는 필수입니다.',
      });
    }

    const result = await growthDiaryService.plantSeedInternal({
      userId,
      itemTypeId: finalItemTypeId,
      level: finalLevel,
    });

    if (result.status === 409) {
      return res.status(409).json({
        success: false,
        message: result.message,
      });
    }

    return res.status(201).json({
      success: true,
      message: '심을 과일이 등록되었습니다.',
      data: result,
    });
  } catch (err) {
    console.error(`[plantFruitInternal] error:`, err.message);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// 내부 API: 심은 나무 삭제/초기화
exports.clearPlantedFruitInternal = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`[clearPlantedFruitInternal] userId: ${userId}`);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId는 필수입니다.',
      });
    }

    const result = await growthDiaryService.clearPlantedFruit(userId);

    return res.status(200).json({
      success: true,
      message: '심은 과일이 초기화되었습니다.',
      data: result,
    });
  } catch (err) {
    console.error(`[clearPlantedFruitInternal] error:`, err.message);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// 내부 API: 현재 성장률 기반 미션 진행상황 조회
exports.getProgressInternal = async (req, res) => {
  try {
    const { userId } = req.query;
    console.log(`[getProgressInternal] userId: ${userId}`);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId는 필수입니다.',
      });
    }

    const progress = await growthDiaryService.getProgress(userId);
    return res.status(200).json({
      success: true,
      data: progress,
    });
  } catch (err) {
    console.error(`[getProgressInternal] error:`, err.message);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
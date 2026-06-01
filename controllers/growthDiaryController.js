const growthDiaryService = require('../services/growthDiaryService');

// 현재 정원/성장 상태 조회
exports.getGarden = async (req, res) => {
  try {
    const userId = req.userId;

    const garden = await growthDiaryService.getGarden(userId);

    res.json({
      success: true,
      data: garden,
    });
  } catch (err) {
    res.status(500).json({
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

    if (result.status === 409) {
      return res.status(409).json({
        success: false,
        message: result.message,
      });
    }

    res.status(201).json({
      success: true,
      message: '씨앗이 심어졌습니다.',
      data: result,
    });
  } catch (err) {
    res.status(500).json({
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

    res.json({
      success: true,
      message: '성장률이 반영되었습니다.',
      data: result,
    });
  } catch (err) {
    res.status(500).json({
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

    res.json({
      success: true,
      data: history,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// 현재 성장 기반 미션 진행 상태 조회
exports.getProgress = async (req, res) => {
  try {
    const userId = req.userId;

    const progress = await growthDiaryService.getProgress(userId);

    res.json({
      success: true,
      data: progress,
    });
  } catch (err) {
    res.status(500).json({
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

    if (result.status === 409) {
      return res.status(409).json({
        success: false,
        message: result.message,
      });
    }

    res.status(201).json({
      success: true,
      message: '일기가 작성되었습니다.',
      data: result,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// 내 일기 목록 조회
exports.getDiaries = async (req, res) => {
  try {
    const userId = req.userId;

    const diaries = await growthDiaryService.getDiaries(userId);

    res.json({
      success: true,
      data: diaries,
    });
  } catch (err) {
    res.status(500).json({
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

    res.json({
      success: true,
      data: diary,
    });
  } catch (err) {
    res.status(500).json({
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

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
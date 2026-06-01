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
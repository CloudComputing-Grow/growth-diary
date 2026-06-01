const express = require('express');
const router = express.Router();

const growthDiaryController = require('../controllers/growthDiaryController');
const requireUser = require('../middlewares/requireUser');

// Garden
router.get('/garden', requireUser, growthDiaryController.getGarden);
router.post('/garden/plant', requireUser, growthDiaryController.plantSeed);

// Growth Rate
router.post('/growth-rate', requireUser, growthDiaryController.increaseGrowthRate);
router.get('/growth-rate/history', requireUser, growthDiaryController.getGrowthRateHistory);

// Progress
router.get('/progress', requireUser, growthDiaryController.getProgress);

// Diary
router.post('/diaries', requireUser, growthDiaryController.createDiary);
router.get('/diaries', requireUser, growthDiaryController.getDiaries);
router.get('/diaries/check', requireUser, growthDiaryController.checkDiary);
router.get('/diaries/:diaryId', requireUser, growthDiaryController.getDiaryById);

module.exports = router;
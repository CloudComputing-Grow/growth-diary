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

module.exports = router;
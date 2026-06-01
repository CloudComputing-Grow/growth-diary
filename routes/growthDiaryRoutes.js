const express = require('express');
const router = express.Router();

const growthDiaryController = require('../controllers/growthDiaryController');
const requireUser = require('../middlewares/requireUser');

// Garden
router.get('/garden', requireUser, growthDiaryController.getGarden);
router.post('/garden/plant', requireUser, growthDiaryController.plantSeed);

module.exports = router;
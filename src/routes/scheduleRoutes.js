const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const { authenticateToken } = require('../middlewares/auth');
const { scheduleValidation } = require('../middlewares/validate');

router.get('/box/:boxId', authenticateToken, scheduleController.getSchedules);
router.post('/save', authenticateToken, scheduleValidation, scheduleController.saveSchedules);

module.exports = router;

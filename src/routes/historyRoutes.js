const express = require('express');
const router = express.Router();
const historyController = require('../controllers/historyController');
const { authenticateToken } = require('../middlewares/auth');

router.get('/', authenticateToken, historyController.getHistory);
router.get('/battery/:boxId', authenticateToken, historyController.getBatteryLogs);

module.exports = router;

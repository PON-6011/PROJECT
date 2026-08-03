const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { authenticateToken, requireRole } = require('../middlewares/auth');

router.get('/', authenticateToken, auditController.getLogs);

module.exports = router;

const express = require('express');
const router = express.Router();
const esp32Controller = require('../controllers/esp32Controller');

router.post('/heartbeat', esp32Controller.heartbeat);
router.get('/schedule', esp32Controller.getSchedule);
router.post('/intake', esp32Controller.logIntake);
router.get('/firmware/check', esp32Controller.checkFirmware);

module.exports = router;

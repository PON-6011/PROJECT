const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');
const { authenticateToken } = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const { devicePairValidation } = require('../middlewares/validate');

router.get('/', authenticateToken, deviceController.getMyDevices);
router.post('/verify', authenticateToken, upload.single('medicine_image'), devicePairValidation, deviceController.verifyAndPair);
router.put('/:id', authenticateToken, upload.single('medicine_image'), deviceController.updateDevice);
router.delete('/:id', authenticateToken, deviceController.deleteDevice);

module.exports = router;

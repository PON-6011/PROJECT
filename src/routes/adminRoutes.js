const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, requireRole } = require('../middlewares/auth');

// All admin routes require admin role
router.get('/overview', authenticateToken, requireRole('admin'), adminController.getOverview);
router.get('/history', authenticateToken, requireRole('admin'), adminController.getRecentHistory);
router.get('/users', authenticateToken, requireRole('admin'), adminController.getAllUsers);
router.post('/users/:id/disable', authenticateToken, requireRole('admin'), adminController.disableUser);
router.post('/users/:id/unbind', authenticateToken, requireRole('admin'), adminController.unbindUserDevices);
router.get('/devices', authenticateToken, requireRole('admin'), adminController.getAllDevices);
router.delete('/users/:id', authenticateToken, requireRole('admin'), adminController.deleteUser);
router.delete('/devices/:id', authenticateToken, requireRole('admin'), adminController.deleteDevice);

module.exports = router;

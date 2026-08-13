const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, requireRole } = require('../middlewares/auth');

// All admin routes require admin role
router.get('/overview', authenticateToken, requireRole('admin'), adminController.getOverview);
router.get('/history', authenticateToken, requireRole('admin'), adminController.getRecentHistory);
router.get('/users', authenticateToken, requireRole('admin'), adminController.getAllUsers);
router.delete('/users/:id', authenticateToken, requireRole('admin'), adminController.deleteUser);

module.exports = router;

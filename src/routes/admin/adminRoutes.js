const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../../middleware/auth');
const {
    showLogin,
    login,
    showDashboard,
    showCalendar,
    showPonencias
} = require('../../../src/controllers/admin/adminController');

// Rutas públicas de administrador
router.get('/login', showLogin);
router.post('/login', login);

// Rutas protegidas de administrador
router.get('/dashboard', requireAuth, requireRole('administrador'), showDashboard);
router.get('/calendar', requireAuth, requireRole('administrador'), showCalendar);
router.get('/ponencias', requireAuth, requireRole('administrador'), showPonencias);

module.exports = router;

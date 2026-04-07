const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../../middleware/auth');
const {
    showLogin,
    login,
    showDashboard,
    showCalendar,
    showRegistro,
    registerEvent
} = require('../../../src/controllers/asistente/asistenteController');

// Rutas públicas de asistente
router.get('/login', showLogin);
router.post('/login', login);

// Rutas protegidas de asistente
router.get('/dashboard', requireAuth, requireRole('asistente'), showDashboard);
router.get('/calendar', requireAuth, requireRole('asistente'), showCalendar);
router.get('/registro', requireAuth, requireRole('asistente'), showRegistro);
router.post('/registro', requireAuth, requireRole('asistente'), registerEvent);

module.exports = router;

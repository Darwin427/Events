const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../../middleware/auth');
const {
    showLogin,
    login,
    showDashboard,
    enviarPropuesta
} = require('../../../src/controllers/ponente/ponenteController');

// Rutas públicas de ponente
router.get('/login', showLogin);
router.post('/login', login);

// Rutas protegidas de ponente
router.get('/dashboard', requireAuth, requireRole('ponente'), showDashboard);
router.post('/enviar-propuesta', requireAuth, requireRole('ponente'), enviarPropuesta);

module.exports = router;

// ============================================
// Rutas del Asistente
// ============================================

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../../middleware/authentication');
const {
    showLogin,
    login,
    logout,
    showRegistro,
    processRegistro,
    showDashboard
} = require('../../controllers/asistente/asistenteController');

// Rutas publicas
router.get('/login', showLogin);
router.post('/login', login);
router.get('/logout', logout);
router.get('/registro', showRegistro);
router.post('/registro', processRegistro);

// Rutas protegidas (sesion + rol asistente)
const requireSession = [requireAuth, requireRole('asistente')];

router.get('/dashboard', requireSession, showDashboard);

// Aqui van las rutas futuras del modulo del asistente:
// router.get('/eventos', requireSession, listarEventos);
// router.post('/eventos/:id/inscribirse', requireSession, inscribirseEvento);
// router.get('/inscripciones', requireSession, misInscripciones);
// etc.

module.exports = router;

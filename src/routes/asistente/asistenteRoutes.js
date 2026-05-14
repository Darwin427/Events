// ============================================
// Rutas del Asistente
// Registro publico auto-aprobado + Login + Inscripciones a eventos
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
    showDashboard,
    showEventos,
    inscribirse,
    cancelarInscripcion,
    showCalendar
} = require('../../controllers/asistente/asistenteController');

// ============================================
// Rutas publicas
// ============================================
router.get('/login', showLogin);
router.post('/login', login);
router.get('/logout', logout);

// Registro publico (auto-aprobado: el asistente puede usar la cuenta inmediatamente)
router.get('/registro', showRegistro);
router.post('/registro', processRegistro);

// ============================================
// Rutas protegidas (sesion + rol asistente)
// ============================================
const requireSession = [requireAuth, requireRole('asistente')];

router.get('/dashboard', requireSession, showDashboard);
router.get('/calendar', requireSession, showCalendar);

// Catalogo de eventos disponibles + accion de inscribirse
router.get('/eventos', requireSession, showEventos);
router.post('/eventos/:id/inscribirse', requireSession, inscribirse);

// Cancelar inscripcion (soft delete)
router.post('/inscripciones/:id/cancelar', requireSession, cancelarInscripcion);

module.exports = router;

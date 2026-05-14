// ============================================
// Rutas del Administrador
// ============================================

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../../middleware/authentication');
const {
    showLogin,
    login,
    logout,
    showDashboard,
    showCalendar,
    showPropuestas,
    showPropuestaReview,
    aprobarPropuesta,
    rechazarPropuesta,
    descargarDocumento,
    showEventEditForm,
    updateEvent,
    cancelEvent,
    showSolicitudes,
    aprobarPonente,
    rechazarPonente,
    desactivarPonente
} = require('../../controllers/admin/adminController');

// Rutas publicas
router.get('/login', showLogin);
router.post('/login', login);
router.get('/logout', logout);

// Rutas protegidas (sesion + rol administrador)
const requireSession = [requireAuth, requireRole('administrador')];

router.get('/dashboard', requireSession, showDashboard);
router.get('/calendar', requireSession, showCalendar);

// Gestion de propuestas
router.get('/propuestas', requireSession, showPropuestas);
router.get('/propuestas/:id', requireSession, showPropuestaReview);
router.post('/propuestas/:id/aprobar', requireSession, aprobarPropuesta);
router.post('/propuestas/:id/rechazar', requireSession, rechazarPropuesta);
router.get('/propuestas/:id/documentos/:docId', requireSession, descargarDocumento);

// Gestion de eventos aprobados (editar y cancelar)
router.get('/eventos/:id/editar', requireSession, showEventEditForm);
router.post('/eventos/:id/editar', requireSession, updateEvent);
router.post('/eventos/:id/cancelar', requireSession, cancelEvent);

// Compatibilidad: /ponencias redirige a /propuestas
router.get('/ponencias', requireSession, (req, res) => res.redirect('/admin/propuestas'));

// Gestion de ponentes
router.get('/solicitudes', requireSession, showSolicitudes);
router.post('/solicitudes/:id/aprobar', requireSession, aprobarPonente);
router.post('/solicitudes/:id/rechazar', requireSession, rechazarPonente);
router.post('/ponentes/:id/desactivar', requireSession, desactivarPonente);

module.exports = router;

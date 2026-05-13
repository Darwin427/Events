// ============================================
// Rutas del Ponente
// ============================================

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../../middleware/authentication');
const { upload } = require('../../config/upload');
const {
    showLogin,
    login,
    logout,
    showRegistro,
    processRegistro,
    showDashboard,
    showNewProposalForm,
    createProposal,
    showProposalDetail,
    showEditForm,
    updateProposal,
    cancelProposal,
    uploadDocument,
    deleteDocument,
    downloadDocument
} = require('../../controllers/ponente/ponenteController');

// ============================================
// RUTAS PUBLICAS
// ============================================
router.get('/login', showLogin);
router.post('/login', login);
router.get('/logout', logout);

router.get('/registro', showRegistro);
router.post('/registro', processRegistro);

// ============================================
// RUTAS PROTEGIDAS (sesion + rol ponente)
// ============================================
const requireSession = [requireAuth, requireRole('ponente')];

router.get('/dashboard', requireSession, showDashboard);

// CRUD de propuestas
router.get('/propuestas/nueva', requireSession, showNewProposalForm);
router.post('/propuestas', requireSession, createProposal);
router.get('/propuestas/:id', requireSession, showProposalDetail);
router.get('/propuestas/:id/editar', requireSession, showEditForm);
router.post('/propuestas/:id/editar', requireSession, updateProposal);
router.post('/propuestas/:id/cancelar', requireSession, cancelProposal);

// Documentos
router.post('/propuestas/:id/documentos',
    requireSession,
    (req, res, next) => {
        upload.single('documento')(req, res, function (err) {
            if (err) {
                console.error('Error de multer:', err.message);
                return res.redirect('/ponente/propuestas/' + req.params.id + '?error=' + encodeURIComponent(err.message));
            }
            next();
        });
    },
    uploadDocument
);
router.get('/propuestas/:id/documentos/:docId/descargar', requireSession, downloadDocument);
router.post('/propuestas/:id/documentos/:docId/eliminar', requireSession, deleteDocument);

module.exports = router;

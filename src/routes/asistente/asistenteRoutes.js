// ============================================
// Rutas del Asistente
// ============================================
// El controller del asistente esta pendiente de migracion a MySQL.
// Por ahora estas rutas devuelven una pagina informativa para que el
// servidor no falle al arrancar. Cuando se desarrolle el modulo del
// asistente, se reemplaza este archivo por las rutas reales con su
// controller migrado a mysql2 + bcryptjs (siguiendo el patron del admin).
// ============================================

const express = require('express');
const router = express.Router();

// Stub temporal: cualquier ruta del asistente muestra "en desarrollo"
function rutaEnDesarrollo(req, res) {
    res.status(503).render('shared/error', {
        title: 'Modulo en desarrollo',
        message: 'El modulo del asistente esta en construccion. Pronto estara disponible.'
    });
}

router.all('/login', rutaEnDesarrollo);
router.all('/dashboard', rutaEnDesarrollo);
router.all('/calendar', rutaEnDesarrollo);
router.all('/registro', rutaEnDesarrollo);

module.exports = router;

const express = require('express');
const router = express.Router();
const {
    showInicio,
    showError,
    logout
} = require('../../controllers/shared/sharedController');

// Rutas compartidas
router.get('/', (req, res) => res.redirect('/inicio'));
router.get('/inicio', showInicio);
router.get('/logout', logout);
router.get('/error', showError);

module.exports = router;

// Middleware para verificar sesión
function requireAuth(req, res, next) {
    if (!req.session.userId) {
        return res.redirect('/inicio');
    }
    next();
}

// Middleware para verificar rol
function requireRole(role) {
    return (req, res, next) => {
        if (req.session.role !== role) {
            return res.status(403).send('Acceso denegado');
        }
        next();
    };
}

module.exports = {
    requireAuth,
    requireRole
};

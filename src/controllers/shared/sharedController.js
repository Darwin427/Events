// Controlador para páginas compartidas

function showInicio(req, res) {
    res.render('shared/inicio', { 
        title: 'Inicio',
        session: req.session 
    });
}

function showError(req, res) {
    res.render('shared/error', { 
        title: 'Error',
        message: req.query.message || 'Ha ocurrido un error' 
    });
}

function logout(req, res) {
    req.session.destroy();
    res.redirect('/inicio');
}

module.exports = {
    showInicio,
    showError,
    logout
};

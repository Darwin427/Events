const { mssql } = require('../../config/database');
const { authenticateDemoUser } = require('../../config/demoUsers');

// Mostrar página de login de administrador
function showLogin(req, res) {
    res.render('admin/login', { 
        title: 'Login Administrador',
        error: null 
    });
}

// Procesar login de administrador
async function login(req, res) {
    try {
        const { email, password } = req.body;
        
        // Modo demostración: usar credenciales predefinidas
        const user = authenticateDemoUser(email, password);
        
        if (user && user.rol.toLowerCase() === 'administrador') {
            req.session.userId = user.idUsuario;
            req.session.role = user.rol;
            res.redirect('/admin/dashboard');
        } else if (user) {
            res.render('admin/login', { 
                title: 'Login Administrador',
                error: '⚠ Acceso denegado. No tiene permisos de administrador.' 
            });
        } else {
            res.render('admin/login', { 
                title: 'Login Administrador',
                error: '⚠ Usuario o contraseña incorrectos.' 
            });
        }
    } catch (err) {
        console.error('Error en login de administrador:', err);
        res.status(500).send('Error del servidor');
    }
}

// Mostrar dashboard del administrador
function showDashboard(req, res) {
    res.render('admin/dashboard', { 
        title: 'Panel Administrador',
        session: req.session 
    });
}

// Mostrar calendario de administrador
function showCalendar(req, res) {
    res.render('admin/calendar', { 
        title: 'Calendario Administrador',
        session: req.session 
    });
}

// Mostrar gestión de ponencias
function showPonencias(req, res) {
    res.render('admin/ponencias', { 
        title: 'Gestión de Ponencias',
        session: req.session 
    });
}

module.exports = {
    showLogin,
    login,
    showDashboard,
    showCalendar,
    showPonencias
};

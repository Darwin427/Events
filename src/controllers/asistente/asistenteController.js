const { mssql } = require('../../config/database');
const { authenticateDemoUser } = require('../../config/demoUsers');

// Mostrar página de login de asistente
function showLogin(req, res) {
    res.render('asistente/login', { 
        title: 'Login Asistente',
        error: null 
    });
}

// Procesar login de asistente
async function login(req, res) {
    try {
        const { email, password } = req.body;
        
        // Modo demostración: usar credenciales predefinidas
        const user = authenticateDemoUser(email, password);
        
        if (user && user.rol.toLowerCase() === 'asistente') {
            req.session.userId = user.idUsuario;
            req.session.role = user.rol;
            res.redirect('/asistente/dashboard');
        } else if (user) {
            res.render('asistente/login', { 
                title: 'Login Asistente',
                error: '⚠ Acceso denegado. No tiene permisos de asistente.' 
            });
        } else {
            res.render('asistente/login', { 
                title: 'Login Asistente',
                error: '⚠ Usuario o contraseña incorrectos.' 
            });
        }
    } catch (err) {
        console.error('Error en login de asistente:', err);
        res.status(500).send('Error del servidor');
    }
}

// Mostrar dashboard del asistente
function showDashboard(req, res) {
    res.render('asistente/dashboard', { 
        title: 'Panel Asistente',
        session: req.session 
    });
}

// Mostrar calendario de eventos
function showCalendar(req, res) {
    res.render('asistente/calendar', { 
        title: 'Calendario de Eventos',
        session: req.session 
    });
}

// Mostrar formulario de registro
function showRegistro(req, res) {
    res.render('asistente/registro', { 
        title: 'Registro a Eventos',
        session: req.session 
    });
}

// Procesar registro a evento
async function registerEvent(req, res) {
    try {
        const { eventId } = req.body;
        const userId = req.session.userId;
        
        const pool = await mssql.connect();
        await pool.request()
            .input('IdUsuario', mssql.Int, userId)
            .input('IdEvento', mssql.Int, eventId)
            .query('INSERT INTO Registros (IdUsuario, IdEvento, FechaRegistro) VALUES (@IdUsuario, @IdEvento, GETDATE())');
        
        res.redirect('/asistente/registro?success=true');
    } catch (err) {
        console.error('Error en registro de evento:', err);
        res.redirect('/asistente/registro?error=true');
    }
}

module.exports = {
    showLogin,
    login,
    showDashboard,
    showCalendar,
    showRegistro,
    registerEvent
};

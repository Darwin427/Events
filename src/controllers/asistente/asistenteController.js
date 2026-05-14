// ============================================
// Controller del Asistente
// Login + registro publico + dashboard (placeholder)
// ============================================
// Nota: el modulo del asistente esta pendiente de desarrollo completo.
// Este archivo deja lista la base de autenticacion para que se construyan
// sobre ella las funcionalidades de inscripcion a eventos, calendario, etc.
// ============================================

const bcrypt = require('bcryptjs');
const { pool } = require('../../config/database');

// ============================================
// LOGIN / LOGOUT
// ============================================

function showLogin(req, res) {
    res.render('asistente/login', {
        title: 'Login Asistente',
        error: null
    });
}

async function login(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.render('asistente/login', {
            title: 'Login Asistente',
            error: 'Debes ingresar correo y contrasena.'
        });
    }

    try {
        const [rows] = await pool.query(
            'SELECT IdUsuario, Nombre, Correo, Contrasena, Rol, EstadoCuenta, Activo FROM Usuarios WHERE Correo = ? AND Rol = ?',
            [email.trim(), 'asistente']
        );

        if (rows.length === 0) {
            return res.render('asistente/login', {
                title: 'Login Asistente',
                error: 'Usuario o contrasena incorrectos.'
            });
        }

        const user = rows[0];

        if (user.Activo === 0 || user.EstadoCuenta === 'rechazada') {
            return res.render('asistente/login', {
                title: 'Login Asistente',
                error: 'Tu cuenta ha sido deshabilitada. Contacta al administrador.'
            });
        }

        const passwordOk = await bcrypt.compare(password, user.Contrasena);
        if (!passwordOk) {
            return res.render('asistente/login', {
                title: 'Login Asistente',
                error: 'Usuario o contrasena incorrectos.'
            });
        }

        req.session.userId = user.IdUsuario;
        req.session.userName = user.Nombre;
        req.session.role = user.Rol;

        return res.redirect('/asistente/dashboard');
    } catch (err) {
        console.error('❌ Error en login de asistente:', err.message);
        return res.status(500).render('shared/error', {
            code: 500,
            title: 'Error del servidor',
            message: 'Ocurrio un error al procesar el inicio de sesion. Intenta de nuevo.'
        });
    }
}

function logout(req, res) {
    req.session.destroy(err => {
        if (err) console.error('Error al cerrar sesion:', err);
        res.redirect('/asistente/login');
    });
}

// ============================================
// REGISTRO PUBLICO (auto-aprobado)
// ============================================
// Los asistentes son usuarios publicos: se registran y entran al sistema
// inmediatamente, sin necesidad de aprobacion del admin.

function showRegistro(req, res) {
    res.render('asistente/registro', {
        title: 'Crear cuenta de asistente',
        error: null,
        success: null,
        form: {}
    });
}

async function processRegistro(req, res) {
    const { nombre, email, password, passwordConfirm } = req.body;
    const form = { nombre, email };

    if (!nombre || !email || !password || !passwordConfirm) {
        return res.render('asistente/registro', {
            title: 'Crear cuenta de asistente',
            error: 'Todos los campos son obligatorios.',
            success: null,
            form
        });
    }

    if (password.length < 8) {
        return res.render('asistente/registro', {
            title: 'Crear cuenta de asistente',
            error: 'La contrasena debe tener al menos 8 caracteres.',
            success: null,
            form
        });
    }

    if (password !== passwordConfirm) {
        return res.render('asistente/registro', {
            title: 'Crear cuenta de asistente',
            error: 'Las contrasenas no coinciden.',
            success: null,
            form
        });
    }

    const correoNormalizado = email.trim().toLowerCase();

    try {
        const [existentes] = await pool.query(
            'SELECT IdUsuario FROM Usuarios WHERE Correo = ?',
            [correoNormalizado]
        );

        if (existentes.length > 0) {
            return res.render('asistente/registro', {
                title: 'Crear cuenta de asistente',
                error: 'Este correo ya esta registrado. ¿Quieres iniciar sesion?',
                success: null,
                form
            });
        }

        const hash = await bcrypt.hash(password, 10);
        await pool.query(
            `INSERT INTO Usuarios (Nombre, Correo, Contrasena, Rol, EstadoCuenta, Activo)
             VALUES (?, ?, ?, 'asistente', 'aprobada', 1)`,
            [nombre.trim(), correoNormalizado, hash]
        );

        return res.render('asistente/registro', {
            title: 'Cuenta creada',
            error: null,
            success: 'Tu cuenta fue creada con exito. Ya puedes iniciar sesion.',
            form: {}
        });
    } catch (err) {
        console.error('❌ Error en registro de asistente:', err.message);
        return res.status(500).render('shared/error', {
            code: 500,
            title: 'Error del servidor',
            message: 'Ocurrio un error al procesar tu registro. Intenta de nuevo.'
        });
    }
}

// ============================================
// DASHBOARD (placeholder)
// ============================================
// Vista placeholder lista para que el siguiente desarrollador implemente
// las funcionalidades del asistente (consultar eventos, inscribirse, etc.)

function showDashboard(req, res) {
    res.render('asistente/dashboard', {
        title: 'Panel del Asistente',
        session: req.session
    });
}

module.exports = {
    showLogin,
    login,
    logout,
    showRegistro,
    processRegistro,
    showDashboard
};

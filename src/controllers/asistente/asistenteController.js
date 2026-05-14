// ============================================
// Controller del Asistente
// Login + Registro publico (auto-aprobado) + Inscripciones a eventos
// Patron: sigue el mismo estilo que adminController y ponenteController.
// ============================================

const bcrypt = require('bcryptjs');
const { pool } = require('../../config/database');

// ============================================
// HELPERS
// ============================================

/**
 * Formato amigable de fecha (es-CO, DD/MMM/YYYY).
 */
function formatDate(d) {
    if (!d) return '';
    const date = (d instanceof Date) ? d : new Date(d);
    return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Formatea TIME (HH:MM:SS) a HH:MM. MySQL devuelve TIME como string.
 */
function formatTime(t) {
    if (!t) return '';
    return String(t).substring(0, 5);
}

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
            [email.trim().toLowerCase(), 'asistente']
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

        // Aunque los asistentes son auto-aprobados, dejamos la guarda por seguridad
        if (user.EstadoCuenta === 'pendiente') {
            return res.render('asistente/login', {
                title: 'Login Asistente',
                error: 'Tu cuenta esta pendiente de aprobacion.'
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
// REGISTRO PUBLICO (AUTO-APROBADO)
// ============================================

function showRegistro(req, res) {
    res.render('asistente/registro', {
        title: 'Registro de Asistente',
        error: null,
        success: null,
        form: {}
    });
}

async function processRegistro(req, res) {
    const { nombre, email, password, passwordConfirm } = req.body;
    const form = { nombre, email };

    // Validaciones basicas
    if (!nombre || !email || !password || !passwordConfirm) {
        return res.render('asistente/registro', {
            title: 'Registro de Asistente',
            error: 'Todos los campos son obligatorios.',
            success: null,
            form
        });
    }

    if (nombre.trim().length < 3) {
        return res.render('asistente/registro', {
            title: 'Registro de Asistente',
            error: 'El nombre debe tener al menos 3 caracteres.',
            success: null,
            form
        });
    }

    // Regex basica de email (la validacion fuerte la hace el atributo type=email del input)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
        return res.render('asistente/registro', {
            title: 'Registro de Asistente',
            error: 'El correo no tiene un formato valido.',
            success: null,
            form
        });
    }

    if (password.length < 8) {
        return res.render('asistente/registro', {
            title: 'Registro de Asistente',
            error: 'La contrasena debe tener al menos 8 caracteres.',
            success: null,
            form
        });
    }

    if (password !== passwordConfirm) {
        return res.render('asistente/registro', {
            title: 'Registro de Asistente',
            error: 'Las contrasenas no coinciden.',
            success: null,
            form
        });
    }

    const correoNormalizado = email.trim().toLowerCase();

    try {
        // Verificar que el correo no exista
        const [existentes] = await pool.query(
            'SELECT IdUsuario FROM Usuarios WHERE Correo = ?',
            [correoNormalizado]
        );

        if (existentes.length > 0) {
            return res.render('asistente/registro', {
                title: 'Registro de Asistente',
                error: 'Este correo ya esta registrado. ¿Quieres iniciar sesion?',
                success: null,
                form
            });
        }

        // Crear el asistente AUTO-APROBADO (a diferencia de ponente, no espera al admin)
        const hash = await bcrypt.hash(password, 10);
        await pool.query(
            `INSERT INTO Usuarios (Nombre, Correo, Contrasena, Rol, EstadoCuenta, Activo)
             VALUES (?, ?, ?, 'asistente', 'aprobada', 1)`,
            [nombre.trim(), correoNormalizado, hash]
        );

        return res.render('asistente/registro', {
            title: 'Cuenta creada',
            error: null,
            success: 'Tu cuenta fue creada exitosamente. Ya puedes iniciar sesion.',
            form: {}
        });
    } catch (err) {
        console.error('❌ Error en registro de asistente:', err.message);
        return res.status(500).render('shared/error', {
            code: 500,
            title: 'Error del servidor',
            message: 'Ocurrio un error al crear tu cuenta. Intenta de nuevo.'
        });
    }
}

// ============================================
// DASHBOARD - Mis inscripciones activas + proximos eventos
// ============================================

async function showDashboard(req, res) {
    try {
        const idAsistente = req.session.userId;

        // Mis inscripciones activas (proximas y pasadas)
        const [inscripciones] = await pool.query(
            `SELECT
                i.IdInscripcion, i.FechaInscripcion, i.Estado AS EstadoInscripcion,
                e.IdEvento, e.FechaDefinitiva, e.HoraInicio, e.HoraFin, e.Lugar, e.CupoMaximo,
                e.Estado AS EstadoEvento,
                p.Tema, p.IdeaPrincipal, p.NombreEmpresa,
                u.Nombre AS NombrePonente
             FROM Inscripciones i
             INNER JOIN Eventos e   ON e.IdEvento = i.IdEvento
             INNER JOIN Propuestas p ON p.IdPropuesta = e.IdPropuesta
             INNER JOIN Usuarios u   ON u.IdUsuario = p.IdPonente
             WHERE i.IdAsistente = ? AND i.Estado = 'activa'
             ORDER BY e.FechaDefinitiva ASC, e.HoraInicio ASC`,
            [idAsistente]
        );

        // Estadisticas rapidas
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const proximas = inscripciones.filter(i => new Date(i.FechaDefinitiva) >= hoy).length;
        const pasadas = inscripciones.length - proximas;

        res.render('asistente/dashboard', {
            title: 'Mi panel',
            session: req.session,
            inscripciones: inscripciones.map(i => ({
                ...i,
                FechaDefinitivaFmt: formatDate(i.FechaDefinitiva),
                HoraInicioFmt: formatTime(i.HoraInicio),
                HoraFinFmt: formatTime(i.HoraFin),
                esPasada: new Date(i.FechaDefinitiva) < hoy
            })),
            stats: {
                total: inscripciones.length,
                proximas,
                pasadas
            }
        });
    } catch (err) {
        console.error('❌ Error en dashboard de asistente:', err.message);
        return res.status(500).render('shared/error', {
            code: 500,
            title: 'Error del servidor',
            message: 'Ocurrio un error al cargar tu panel.'
        });
    }
}

// ============================================
// CATALOGO DE EVENTOS - Disponibles para inscribirse
// ============================================

async function showEventos(req, res) {
    try {
        const idAsistente = req.session.userId;
        const mensaje = req.session.flash;
        delete req.session.flash; // flash message: consumir una vez

        // Eventos activos y futuros, con conteo de inscripciones y si el asistente ya esta inscrito
        const [eventos] = await pool.query(
            `SELECT
                e.IdEvento, e.FechaDefinitiva, e.HoraInicio, e.HoraFin, e.Lugar, e.CupoMaximo,
                p.Tema, p.IdeaPrincipal, p.NombreEmpresa,
                u.Nombre AS NombrePonente,
                (SELECT COUNT(*) FROM Inscripciones WHERE IdEvento = e.IdEvento AND Estado = 'activa') AS Inscritos,
                (SELECT COUNT(*) FROM Inscripciones WHERE IdEvento = e.IdEvento AND IdAsistente = ? AND Estado = 'activa') AS YaInscrito,
                EXISTS(SELECT 1 FROM Inscripciones WHERE IdEvento = e.IdEvento AND IdAsistente = ? AND Estado = 'cancelada') AS InscripcionCancelada
             FROM Eventos e
             INNER JOIN Propuestas p ON p.IdPropuesta = e.IdPropuesta
             INNER JOIN Usuarios u   ON u.IdUsuario = p.IdPonente
             WHERE e.Estado = 'activo'
               AND e.FechaDefinitiva >= CURDATE()
             ORDER BY e.FechaDefinitiva ASC, e.HoraInicio ASC`,
            [idAsistente, idAsistente]
        );

        res.render('asistente/eventos', {
            title: 'Eventos disponibles',
            session: req.session,
            mensaje,
            eventos: eventos.map(e => ({
                ...e,
                FechaDefinitivaFmt: formatDate(e.FechaDefinitiva),
                HoraInicioFmt: formatTime(e.HoraInicio),
                HoraFinFmt: formatTime(e.HoraFin),
                cupoDisponible: e.CupoMaximo - e.Inscritos,
                lleno: e.Inscritos >= e.CupoMaximo,
                yaInscrito: e.YaInscrito > 0,
                inscripcionCancelada: !!e.InscripcionCancelada
            }))
        });
    } catch (err) {
        console.error('❌ Error en listado de eventos:', err.message);
        return res.status(500).render('shared/error', {
            code: 500,
            title: 'Error del servidor',
            message: 'Ocurrio un error al cargar los eventos.'
        });
    }
}

// ============================================
// INSCRIBIRSE A UN EVENTO
// ============================================

async function inscribirse(req, res) {
    const idAsistente = req.session.userId;
    const idEvento = parseInt(req.params.id, 10);

    if (!idEvento || isNaN(idEvento)) {
        req.session.flash = { tipo: 'error', texto: 'Evento invalido.' };
        return res.redirect('/asistente/eventos');
    }

    // Usamos una conexion dedicada para meter la transaccion: verificacion + insert
    // dentro del mismo lock evita race conditions cuando varios usuarios se inscriben
    // al mismo evento al mismo tiempo y el cupo esta a punto de llenarse.
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        // 1. Verificar que el evento exista, este activo y no haya pasado
        const [eventos] = await conn.query(
            `SELECT IdEvento, FechaDefinitiva, CupoMaximo, Estado
             FROM Eventos
             WHERE IdEvento = ?
             FOR UPDATE`,
            [idEvento]
        );

        if (eventos.length === 0) {
            await conn.rollback();
            req.session.flash = { tipo: 'error', texto: 'El evento no existe.' };
            return res.redirect('/asistente/eventos');
        }

        const evento = eventos[0];

        if (evento.Estado !== 'activo') {
            await conn.rollback();
            req.session.flash = { tipo: 'error', texto: 'Este evento no esta disponible.' };
            return res.redirect('/asistente/eventos');
        }

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        if (new Date(evento.FechaDefinitiva) < hoy) {
            await conn.rollback();
            req.session.flash = { tipo: 'error', texto: 'No puedes inscribirte a un evento que ya paso.' };
            return res.redirect('/asistente/eventos');
        }

        // 2. Verificar que no haya una inscripcion ya (activa o cancelada)
        const [existentes] = await conn.query(
            `SELECT IdInscripcion, Estado
             FROM Inscripciones
             WHERE IdAsistente = ? AND IdEvento = ?`,
            [idAsistente, idEvento]
        );

        if (existentes.length > 0) {
            await conn.rollback();
            const mensaje = existentes[0].Estado === 'activa'
                ? 'Ya estas inscrito en este evento.'
                : 'Ya cancelaste tu inscripcion a este evento. Contacta al administrador si necesitas re-inscribirte.';
            req.session.flash = { tipo: 'error', texto: mensaje };
            return res.redirect('/asistente/eventos');
        }

        // 3. Verificar cupo disponible
        const [cupoRows] = await conn.query(
            `SELECT COUNT(*) AS inscritos
             FROM Inscripciones
             WHERE IdEvento = ? AND Estado = 'activa'`,
            [idEvento]
        );

        if (cupoRows[0].inscritos >= evento.CupoMaximo) {
            await conn.rollback();
            req.session.flash = { tipo: 'error', texto: 'El cupo de este evento esta lleno.' };
            return res.redirect('/asistente/eventos');
        }

        // 4. Crear la inscripcion
        await conn.query(
            `INSERT INTO Inscripciones (IdAsistente, IdEvento, Estado)
             VALUES (?, ?, 'activa')`,
            [idAsistente, idEvento]
        );

        await conn.commit();
        req.session.flash = { tipo: 'exito', texto: 'Te inscribiste correctamente al evento.' };
        return res.redirect('/asistente/dashboard');
    } catch (err) {
        if (conn) await conn.rollback();
        console.error('❌ Error al inscribirse:', err.message);
        req.session.flash = { tipo: 'error', texto: 'Ocurrio un error al procesar tu inscripcion.' };
        return res.redirect('/asistente/eventos');
    } finally {
        if (conn) conn.release();
    }
}

// ============================================
// CANCELAR INSCRIPCION (soft delete)
// ============================================

async function cancelarInscripcion(req, res) {
    const idAsistente = req.session.userId;
    const idInscripcion = parseInt(req.params.id, 10);
    const { motivo } = req.body;

    if (!idInscripcion || isNaN(idInscripcion)) {
        req.session.flash = { tipo: 'error', texto: 'Inscripcion invalida.' };
        return res.redirect('/asistente/dashboard');
    }

    try {
        // Buscar la inscripcion y validar que sea del usuario logueado
        const [rows] = await pool.query(
            `SELECT i.IdInscripcion, i.Estado, e.FechaDefinitiva
             FROM Inscripciones i
             INNER JOIN Eventos e ON e.IdEvento = i.IdEvento
             WHERE i.IdInscripcion = ? AND i.IdAsistente = ?`,
            [idInscripcion, idAsistente]
        );

        if (rows.length === 0) {
            req.session.flash = { tipo: 'error', texto: 'No se encontro la inscripcion.' };
            return res.redirect('/asistente/dashboard');
        }

        const insc = rows[0];

        if (insc.Estado !== 'activa') {
            req.session.flash = { tipo: 'error', texto: 'Esta inscripcion ya estaba cancelada.' };
            return res.redirect('/asistente/dashboard');
        }

        // No permitir cancelar eventos que ya pasaron
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        if (new Date(insc.FechaDefinitiva) < hoy) {
            req.session.flash = { tipo: 'error', texto: 'No puedes cancelar inscripciones a eventos que ya pasaron.' };
            return res.redirect('/asistente/dashboard');
        }

        // Soft delete: marcamos como cancelada y guardamos motivo (opcional) + fecha
        const motivoFinal = (motivo && motivo.trim()) ? motivo.trim().substring(0, 500) : null;
        await pool.query(
            `UPDATE Inscripciones
             SET Estado = 'cancelada',
                 FechaCancelacion = NOW(),
                 MotivoCancelacion = ?
             WHERE IdInscripcion = ?`,
            [motivoFinal, idInscripcion]
        );

        req.session.flash = { tipo: 'exito', texto: 'Tu inscripcion fue cancelada.' };
        return res.redirect('/asistente/dashboard');
    } catch (err) {
        console.error('❌ Error al cancelar inscripcion:', err.message);
        req.session.flash = { tipo: 'error', texto: 'Ocurrio un error al cancelar la inscripcion.' };
        return res.redirect('/asistente/dashboard');
    }
}

// ============================================
// CALENDARIO - Vista mensual de mis eventos
// ============================================

async function showCalendar(req, res) {
    try {
        const idAsistente = req.session.userId;

        // Mis eventos inscritos (futuros y recientes)
        const [misEventos] = await pool.query(
            `SELECT
                e.IdEvento, e.FechaDefinitiva, e.HoraInicio, e.HoraFin, e.Lugar,
                p.Tema,
                i.IdInscripcion, i.Estado AS EstadoInscripcion
             FROM Inscripciones i
             INNER JOIN Eventos e   ON e.IdEvento = i.IdEvento
             INNER JOIN Propuestas p ON p.IdPropuesta = e.IdPropuesta
             WHERE i.IdAsistente = ? AND i.Estado = 'activa'
             ORDER BY e.FechaDefinitiva ASC`,
            [idAsistente]
        );

        // Tambien mostramos todos los eventos disponibles para que el asistente
        // vea contexto, aunque no este inscrito en ellos
        const [todosEventos] = await pool.query(
            `SELECT
                e.IdEvento, e.FechaDefinitiva, e.HoraInicio, e.HoraFin, e.Lugar,
                p.Tema
             FROM Eventos e
             INNER JOIN Propuestas p ON p.IdPropuesta = e.IdPropuesta
             WHERE e.Estado = 'activo' AND e.FechaDefinitiva >= CURDATE()
             ORDER BY e.FechaDefinitiva ASC`
        );

        // Pasamos los IDs en los que el asistente esta inscrito para que la vista
        // los pueda resaltar
        const idsInscrito = new Set(misEventos.map(e => e.IdEvento));

        res.render('asistente/calendar', {
            title: 'Calendario',
            session: req.session,
            misEventos: misEventos.map(e => ({
                ...e,
                FechaDefinitivaFmt: formatDate(e.FechaDefinitiva),
                HoraInicioFmt: formatTime(e.HoraInicio),
                HoraFinFmt: formatTime(e.HoraFin)
            })),
            todosEventos: todosEventos.map(e => ({
                ...e,
                FechaDefinitivaFmt: formatDate(e.FechaDefinitiva),
                HoraInicioFmt: formatTime(e.HoraInicio),
                HoraFinFmt: formatTime(e.HoraFin),
                inscrito: idsInscrito.has(e.IdEvento)
            }))
        });
    } catch (err) {
        console.error('❌ Error en calendario de asistente:', err.message);
        return res.status(500).render('shared/error', {
            code: 500,
            title: 'Error del servidor',
            message: 'Ocurrio un error al cargar el calendario.'
        });
    }
}

module.exports = {
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
};

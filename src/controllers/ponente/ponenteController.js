// ============================================
// Controller del Ponente
// Login + CRUD de propuestas + dashboard
// ============================================

const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const { pool } = require('../../config/database');
const { ALLOWED_EXTENSIONS } = require('../../config/upload');

const MAX_DOCS_POR_PROPUESTA = 3;

// ============================================
// HELPERS
// ============================================

/**
 * Verifica que una propuesta pertenezca al ponente logueado.
 * Retorna la fila de la propuesta o null si no le pertenece / no existe.
 */
async function getPropuestaOwnedBy(idPropuesta, idPonente) {
    const [rows] = await pool.query(
        'SELECT * FROM Propuestas WHERE IdPropuesta = ? AND IdPonente = ?',
        [idPropuesta, idPonente]
    );
    return rows.length > 0 ? rows[0] : null;
}

/**
 * Formato amigable de fecha (DD/MM/YYYY).
 */
function formatDate(d) {
    if (!d) return '';
    const date = (d instanceof Date) ? d : new Date(d);
    return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ============================================
// LOGIN / LOGOUT
// ============================================

function showLogin(req, res) {
    res.render('ponente/login', {
        title: 'Login Ponente',
        error: null
    });
}

async function login(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.render('ponente/login', {
            title: 'Login Ponente',
            error: 'Debes ingresar correo y contrasena.'
        });
    }

    try {
        const [rows] = await pool.query(
            'SELECT IdUsuario, Nombre, Correo, Contrasena, Rol, EstadoCuenta, Activo FROM Usuarios WHERE Correo = ? AND Rol = ?',
            [email.trim(), 'ponente']
        );

        if (rows.length === 0) {
            return res.render('ponente/login', {
                title: 'Login Ponente',
                error: 'Usuario o contrasena incorrectos.'
            });
        }

        const user = rows[0];

        if (user.EstadoCuenta === 'pendiente') {
            return res.render('ponente/login', {
                title: 'Login Ponente',
                error: 'Tu solicitud de cuenta esta pendiente de aprobacion por parte del administrador.'
            });
        }

        if (user.Activo === 0 || user.EstadoCuenta === 'rechazada') {
            return res.render('ponente/login', {
                title: 'Login Ponente',
                error: 'Tu cuenta ha sido deshabilitada. Contacta al administrador.'
            });
        }

        const passwordOk = await bcrypt.compare(password, user.Contrasena);
        if (!passwordOk) {
            return res.render('ponente/login', {
                title: 'Login Ponente',
                error: 'Usuario o contrasena incorrectos.'
            });
        }

        req.session.userId = user.IdUsuario;
        req.session.userName = user.Nombre;
        req.session.role = user.Rol;

        return res.redirect('/ponente/dashboard');
    } catch (err) {
        console.error('❌ Error en login de ponente:', err.message);
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
        res.redirect('/ponente/login');
    });
}

// ============================================
// SOLICITUD DE CUENTA (REGISTRO PUBLICO)
// ============================================

function showRegistro(req, res) {
    res.render('ponente/registro', {
        title: 'Solicitar cuenta de ponente',
        error: null,
        success: null,
        form: {}
    });
}

async function processRegistro(req, res) {
    const { nombre, email, password, passwordConfirm, esInterno, nombreEmpresa } = req.body;
    const form = { nombre, email, esInterno: esInterno === 'on', nombreEmpresa };

    // Validaciones
    if (!nombre || !email || !password || !passwordConfirm) {
        return res.render('ponente/registro', {
            title: 'Solicitar cuenta de ponente',
            error: 'Todos los campos obligatorios deben estar completos.',
            success: null,
            form
        });
    }

    if (password.length < 8) {
        return res.render('ponente/registro', {
            title: 'Solicitar cuenta de ponente',
            error: 'La contrasena debe tener al menos 8 caracteres.',
            success: null,
            form
        });
    }

    if (password !== passwordConfirm) {
        return res.render('ponente/registro', {
            title: 'Solicitar cuenta de ponente',
            error: 'Las contrasenas no coinciden.',
            success: null,
            form
        });
    }

    if (esInterno !== 'on' && (!nombreEmpresa || nombreEmpresa.trim() === '')) {
        return res.render('ponente/registro', {
            title: 'Solicitar cuenta de ponente',
            error: 'Debes indicar el nombre de la empresa o marcar que eres parte de la universidad.',
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
            return res.render('ponente/registro', {
                title: 'Solicitar cuenta de ponente',
                error: 'Este correo ya esta registrado. ¿Quieres iniciar sesion?',
                success: null,
                form
            });
        }

        // Crear la solicitud
        const hash = await bcrypt.hash(password, 10);
        await pool.query(
            `INSERT INTO Usuarios (Nombre, Correo, Contrasena, Rol, EstadoCuenta, Activo)
             VALUES (?, ?, ?, 'ponente', 'pendiente', 1)`,
            [nombre.trim(), correoNormalizado, hash]
        );

        return res.render('ponente/registro', {
            title: 'Solicitud enviada',
            error: null,
            success: 'Tu solicitud fue enviada. Cuando el administrador la apruebe, podras iniciar sesion.',
            form: {}
        });
    } catch (err) {
        console.error('❌ Error en registro de ponente:', err.message);
        return res.status(500).render('shared/error', {
            code: 500,
            title: 'Error del servidor',
            message: 'Ocurrio un error al procesar la solicitud. Intenta de nuevo.'
        });
    }
}

// ============================================
// DASHBOARD - Lista de propuestas
// ============================================

async function showDashboard(req, res) {
    try {
        const idPonente = req.session.userId;

        const [propuestas] = await pool.query(
            `SELECT
                p.IdPropuesta, p.NombreEmpresa, p.Tema, p.IdeaPrincipal, p.Vision,
                p.AlcanceEsperado, p.FechaTentativa, p.Estado, p.MotivoRechazo, p.FechaEnvio,
                e.FechaDefinitiva, e.HoraInicio, e.HoraFin, e.Lugar, e.CupoMaximo,
                (SELECT COUNT(*) FROM DocumentosPropuesta WHERE IdPropuesta = p.IdPropuesta) AS NumDocumentos
             FROM Propuestas p
             LEFT JOIN Eventos e ON e.IdPropuesta = p.IdPropuesta
             WHERE p.IdPonente = ?
             ORDER BY p.FechaEnvio DESC`,
            [idPonente]
        );

        res.render('ponente/dashboard', {
            title: 'Mis propuestas',
            session: req.session,
            propuestas,
            formatDate
        });
    } catch (err) {
        console.error('❌ Error al cargar dashboard del ponente:', err.message);
        res.status(500).render('shared/error', {
            code: 500,
            title: 'Error del servidor',
            message: 'No se pudo cargar tus propuestas. Intenta de nuevo.'
        });
    }
}

// ============================================
// NUEVA PROPUESTA
// ============================================

function showNewProposalForm(req, res) {
    res.render('ponente/propuesta-form', {
        title: 'Nueva propuesta',
        session: req.session,
        mode: 'create',
        propuesta: {},
        error: null
    });
}

async function createProposal(req, res) {
    const { nombreEmpresa, esInterno, tema, ideaPrincipal, vision, alcanceEsperado, fechaTentativa } = req.body;
    const idPonente = req.session.userId;

    // Validaciones
    const errores = [];
    if (!tema || tema.trim().length === 0) errores.push('El tema es obligatorio.');
    if (!ideaPrincipal || ideaPrincipal.trim().length === 0) errores.push('La idea principal es obligatoria.');
    if (!vision || vision.trim().length === 0) errores.push('La vision es obligatoria.');

    const alcanceNum = parseInt(alcanceEsperado, 10);
    if (isNaN(alcanceNum) || alcanceNum <= 0) errores.push('El alcance esperado debe ser un numero mayor a 0.');

    if (!fechaTentativa) errores.push('La fecha tentativa es obligatoria.');
    else {
        const fecha = new Date(fechaTentativa);
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        if (fecha <= hoy) errores.push('La fecha tentativa debe ser mayor a hoy.');
    }

    const empresaFinal = (esInterno === 'on') ? null : (nombreEmpresa ? nombreEmpresa.trim() : null);
    if (esInterno !== 'on' && !empresaFinal) {
        errores.push('Debes indicar la empresa o marcar que eres parte de la universidad.');
    }

    if (errores.length > 0) {
        return res.render('ponente/propuesta-form', {
            title: 'Nueva propuesta',
            session: req.session,
            mode: 'create',
            propuesta: req.body,
            error: errores.join(' ')
        });
    }

    try {
        const [result] = await pool.query(
            `INSERT INTO Propuestas
                (IdPonente, NombreEmpresa, Tema, IdeaPrincipal, Vision, AlcanceEsperado, FechaTentativa, Estado)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'pendiente')`,
            [idPonente, empresaFinal, tema.trim(), ideaPrincipal.trim(), vision.trim(), alcanceNum, fechaTentativa]
        );

        return res.redirect('/ponente/dashboard');
    } catch (err) {
        console.error('❌ Error al crear propuesta:', err.message);
        return res.status(500).render('shared/error', {
            code: 500,
            title: 'Error del servidor',
            message: 'No se pudo crear la propuesta. Intenta de nuevo.'
        });
    }
}

// ============================================
// VER DETALLE DE UNA PROPUESTA
// ============================================

async function showProposalDetail(req, res) {
    const idPropuesta = parseInt(req.params.id, 10);
    if (isNaN(idPropuesta)) {
        return res.status(404).render('shared/error', { code: 404, title: 'No encontrada', message: 'Propuesta no encontrada.' });
    }

    try {
        const idPonente = req.session.userId;
        const [propuestas] = await pool.query(
            `SELECT
                p.*,
                e.FechaDefinitiva, e.HoraInicio, e.HoraFin, e.Lugar, e.CupoMaximo
             FROM Propuestas p
             LEFT JOIN Eventos e ON e.IdPropuesta = p.IdPropuesta
             WHERE p.IdPropuesta = ? AND p.IdPonente = ?`,
            [idPropuesta, idPonente]
        );

        if (propuestas.length === 0) {
            return res.status(404).render('shared/error', { code: 404, title: 'No encontrada', message: 'Esta propuesta no existe o no te pertenece.' });
        }

        const [documentos] = await pool.query(
            'SELECT * FROM DocumentosPropuesta WHERE IdPropuesta = ? ORDER BY FechaSubida',
            [idPropuesta]
        );

        // Mapear codigo de error de query string a mensaje amigable
        let errorArchivo = null;
        if (req.query.error === 'max-files') {
            errorArchivo = 'Ya alcanzaste el máximo de 3 archivos. Elimina alguno antes de subir otro.';
        } else if (req.query.error === 'no-file') {
            errorArchivo = 'Debes seleccionar un archivo antes de enviarlo.';
        } else if (req.query.error) {
            errorArchivo = decodeURIComponent(req.query.error);
        }

        res.render('ponente/propuesta-detalle', {
            title: propuestas[0].Tema,
            session: req.session,
            propuesta: propuestas[0],
            documentos,
            errorArchivo,
            formatDate
        });
    } catch (err) {
        console.error('❌ Error al cargar detalle:', err.message);
        res.status(500).render('shared/error', { code: 500, title: 'Error del servidor', message: 'No se pudo cargar la propuesta.' });
    }
}

// ============================================
// EDITAR PROPUESTA
// ============================================

async function showEditForm(req, res) {
    const idPropuesta = parseInt(req.params.id, 10);
    if (isNaN(idPropuesta)) {
        return res.status(404).render('shared/error', { code: 404, title: 'No encontrada', message: 'Propuesta no encontrada.' });
    }

    try {
        const propuesta = await getPropuestaOwnedBy(idPropuesta, req.session.userId);
        if (!propuesta) {
            return res.status(404).render('shared/error', { code: 404, title: 'No encontrada', message: 'Esta propuesta no existe o no te pertenece.' });
        }

        if (propuesta.Estado !== 'pendiente') {
            return res.status(403).render('shared/error', {
                code: 403,
                title: 'No editable',
                message: 'Solo puedes editar propuestas en estado pendiente.'
            });
        }

        // Formatear fecha para input[type=date]
        if (propuesta.FechaTentativa) {
            propuesta.FechaTentativa = new Date(propuesta.FechaTentativa).toISOString().split('T')[0];
        }

        res.render('ponente/propuesta-form', {
            title: 'Editar propuesta',
            session: req.session,
            mode: 'edit',
            propuesta,
            error: null
        });
    } catch (err) {
        console.error('❌ Error al cargar formulario de edicion:', err.message);
        res.status(500).render('shared/error', { code: 500, title: 'Error del servidor', message: 'No se pudo cargar la propuesta.' });
    }
}

async function updateProposal(req, res) {
    const idPropuesta = parseInt(req.params.id, 10);
    if (isNaN(idPropuesta)) {
        return res.status(404).render('shared/error', { code: 404, title: 'No encontrada', message: 'Propuesta no encontrada.' });
    }

    try {
        const propuesta = await getPropuestaOwnedBy(idPropuesta, req.session.userId);
        if (!propuesta) {
            return res.status(404).render('shared/error', { code: 404, title: 'No encontrada', message: 'Esta propuesta no existe o no te pertenece.' });
        }

        if (propuesta.Estado !== 'pendiente') {
            return res.status(403).render('shared/error', {
                code: 403,
                title: 'No editable',
                message: 'Solo puedes editar propuestas en estado pendiente.'
            });
        }

        const { nombreEmpresa, esInterno, tema, ideaPrincipal, vision, alcanceEsperado, fechaTentativa } = req.body;

        // Validaciones (mismas que en create)
        const errores = [];
        if (!tema || tema.trim().length === 0) errores.push('El tema es obligatorio.');
        if (!ideaPrincipal || ideaPrincipal.trim().length === 0) errores.push('La idea principal es obligatoria.');
        if (!vision || vision.trim().length === 0) errores.push('La vision es obligatoria.');

        const alcanceNum = parseInt(alcanceEsperado, 10);
        if (isNaN(alcanceNum) || alcanceNum <= 0) errores.push('El alcance esperado debe ser un numero mayor a 0.');

        if (!fechaTentativa) errores.push('La fecha tentativa es obligatoria.');
        else {
            const fecha = new Date(fechaTentativa);
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            if (fecha <= hoy) errores.push('La fecha tentativa debe ser mayor a hoy.');
        }

        const empresaFinal = (esInterno === 'on') ? null : (nombreEmpresa ? nombreEmpresa.trim() : null);
        if (esInterno !== 'on' && !empresaFinal) {
            errores.push('Debes indicar la empresa o marcar que eres parte de la universidad.');
        }

        if (errores.length > 0) {
            return res.render('ponente/propuesta-form', {
                title: 'Editar propuesta',
                session: req.session,
                mode: 'edit',
                propuesta: { ...req.body, IdPropuesta: idPropuesta },
                error: errores.join(' ')
            });
        }

        await pool.query(
            `UPDATE Propuestas
             SET NombreEmpresa = ?, Tema = ?, IdeaPrincipal = ?, Vision = ?,
                 AlcanceEsperado = ?, FechaTentativa = ?
             WHERE IdPropuesta = ? AND IdPonente = ?`,
            [empresaFinal, tema.trim(), ideaPrincipal.trim(), vision.trim(), alcanceNum, fechaTentativa, idPropuesta, req.session.userId]
        );

        return res.redirect('/ponente/dashboard');
    } catch (err) {
        console.error('❌ Error al actualizar propuesta:', err.message);
        return res.status(500).render('shared/error', { code: 500, title: 'Error del servidor', message: 'No se pudo actualizar la propuesta.' });
    }
}

// ============================================
// CANCELAR PROPUESTA (soft delete)
// ============================================

async function cancelProposal(req, res) {
    const idPropuesta = parseInt(req.params.id, 10);
    if (isNaN(idPropuesta)) {
        return res.status(404).render('shared/error', { code: 404, title: 'No encontrada', message: 'Propuesta no encontrada.' });
    }

    try {
        const propuesta = await getPropuestaOwnedBy(idPropuesta, req.session.userId);
        if (!propuesta) {
            return res.status(404).render('shared/error', { code: 404, title: 'No encontrada', message: 'Esta propuesta no existe o no te pertenece.' });
        }

        if (propuesta.Estado !== 'pendiente') {
            return res.status(403).render('shared/error', {
                code: 403,
                title: 'No cancelable',
                message: 'Solo puedes cancelar propuestas en estado pendiente.'
            });
        }

        await pool.query(
            "UPDATE Propuestas SET Estado = 'cancelada' WHERE IdPropuesta = ? AND IdPonente = ?",
            [idPropuesta, req.session.userId]
        );

        return res.redirect('/ponente/dashboard');
    } catch (err) {
        console.error('❌ Error al cancelar propuesta:', err.message);
        return res.status(500).render('shared/error', { code: 500, title: 'Error del servidor', message: 'No se pudo cancelar la propuesta.' });
    }
}

// ============================================
// GESTION DE DOCUMENTOS
// ============================================

async function uploadDocument(req, res) {
    const idPropuesta = parseInt(req.params.id, 10);
    if (isNaN(idPropuesta)) {
        return res.status(404).render('shared/error', { code: 404, title: 'No encontrada', message: 'Propuesta no encontrada.' });
    }

    try {
        const propuesta = await getPropuestaOwnedBy(idPropuesta, req.session.userId);
        if (!propuesta) {
            // Si subio archivo, borrarlo
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(404).render('shared/error', { code: 404, title: 'No encontrada', message: 'Esta propuesta no existe o no te pertenece.' });
        }

        if (propuesta.Estado !== 'pendiente') {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(403).render('shared/error', {
                code: 403,
                title: 'No editable',
                message: 'Solo puedes adjuntar archivos a propuestas en estado pendiente.'
            });
        }

        if (!req.file) {
            return res.redirect('/ponente/propuestas/' + idPropuesta + '?error=no-file');
        }

        // Verificar limite de 3 archivos
        const [count] = await pool.query(
            'SELECT COUNT(*) AS total FROM DocumentosPropuesta WHERE IdPropuesta = ?',
            [idPropuesta]
        );

        if (count[0].total >= MAX_DOCS_POR_PROPUESTA) {
            fs.unlinkSync(req.file.path);
            return res.redirect('/ponente/propuestas/' + idPropuesta + '?error=max-files');
        }

        const tipoArchivo = path.extname(req.file.originalname).toLowerCase().replace('.', '');
        const rutaRelativa = 'uploads/propuestas/' + idPropuesta + '/' + req.file.filename;

        await pool.query(
            `INSERT INTO DocumentosPropuesta
                (IdPropuesta, NombreOriginal, RutaArchivo, TipoArchivo, TamanoBytes)
             VALUES (?, ?, ?, ?, ?)`,
            [idPropuesta, req.file.originalname, rutaRelativa, tipoArchivo, req.file.size]
        );

        return res.redirect('/ponente/propuestas/' + idPropuesta);
    } catch (err) {
        console.error('❌ Error al subir documento:', err.message);
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(500).render('shared/error', { code: 500, title: 'Error del servidor', message: 'No se pudo subir el archivo.' });
    }
}

async function deleteDocument(req, res) {
    const idPropuesta = parseInt(req.params.id, 10);
    const idDocumento = parseInt(req.params.docId, 10);
    if (isNaN(idPropuesta) || isNaN(idDocumento)) {
        return res.status(404).render('shared/error', { code: 404, title: 'No encontrado', message: 'Documento no encontrado.' });
    }

    try {
        const propuesta = await getPropuestaOwnedBy(idPropuesta, req.session.userId);
        if (!propuesta) {
            return res.status(404).render('shared/error', { code: 404, title: 'No encontrada', message: 'Esta propuesta no existe o no te pertenece.' });
        }

        if (propuesta.Estado !== 'pendiente') {
            return res.status(403).render('shared/error', {
                code: 403,
                title: 'No editable',
                message: 'Solo puedes eliminar archivos de propuestas en estado pendiente.'
            });
        }

        // Buscar el documento
        const [docs] = await pool.query(
            'SELECT * FROM DocumentosPropuesta WHERE IdDocumento = ? AND IdPropuesta = ?',
            [idDocumento, idPropuesta]
        );

        if (docs.length === 0) {
            return res.redirect('/ponente/propuestas/' + idPropuesta);
        }

        const doc = docs[0];
        const filePath = path.join(__dirname, '..', '..', '..', doc.RutaArchivo);

        // Eliminar archivo fisico
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

        // Eliminar registro
        await pool.query('DELETE FROM DocumentosPropuesta WHERE IdDocumento = ?', [idDocumento]);

        return res.redirect('/ponente/propuestas/' + idPropuesta);
    } catch (err) {
        console.error('❌ Error al eliminar documento:', err.message);
        return res.status(500).render('shared/error', { code: 500, title: 'Error del servidor', message: 'No se pudo eliminar el archivo.' });
    }
}

async function downloadDocument(req, res) {
    const idPropuesta = parseInt(req.params.id, 10);
    const idDocumento = parseInt(req.params.docId, 10);
    if (isNaN(idPropuesta) || isNaN(idDocumento)) {
        return res.status(404).render('shared/error', { code: 404, title: 'No encontrado', message: 'Documento no encontrado.' });
    }

    try {
        const propuesta = await getPropuestaOwnedBy(idPropuesta, req.session.userId);
        if (!propuesta) {
            return res.status(404).render('shared/error', { code: 404, title: 'No encontrada', message: 'Esta propuesta no existe o no te pertenece.' });
        }

        const [docs] = await pool.query(
            'SELECT * FROM DocumentosPropuesta WHERE IdDocumento = ? AND IdPropuesta = ?',
            [idDocumento, idPropuesta]
        );

        if (docs.length === 0) {
            return res.status(404).render('shared/error', { code: 404, title: 'No encontrado', message: 'Documento no encontrado.' });
        }

        const doc = docs[0];
        const filePath = path.join(__dirname, '..', '..', '..', doc.RutaArchivo);

        if (!fs.existsSync(filePath)) {
            return res.status(404).render('shared/error', { code: 404, title: 'No encontrado', message: 'El archivo no esta disponible.' });
        }

        return res.download(filePath, doc.NombreOriginal);
    } catch (err) {
        console.error('❌ Error al descargar documento:', err.message);
        return res.status(500).render('shared/error', { code: 500, title: 'Error del servidor', message: 'No se pudo descargar el archivo.' });
    }
}

module.exports = {
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
};

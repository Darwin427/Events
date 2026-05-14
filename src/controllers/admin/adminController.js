// ============================================
// Controller del Administrador
// Autenticacion contra MySQL con bcrypt
// ============================================

const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const { pool } = require('../../config/database');

// Mostrar pagina de login de administrador
function showLogin(req, res) {
    res.render('admin/login', {
        title: 'Login Administrador',
        error: null
    });
}

// Procesar login de administrador
async function login(req, res) {
    const { email, password } = req.body;

    // Validacion basica de input
    if (!email || !password) {
        return res.render('admin/login', {
            title: 'Login Administrador',
            error: '⚠ Debes ingresar correo y contrasena.'
        });
    }

    try {
        // Consultar el usuario con el correo y rol administrador (con parametro preparado)
        const [rows] = await pool.query(
            'SELECT IdUsuario, Nombre, Correo, Contrasena, Rol, EstadoCuenta, Activo FROM Usuarios WHERE Correo = ? AND Rol = ?',
            [email.trim(), 'administrador']
        );

        // Caso 1: no se encontro un admin con ese correo
        if (rows.length === 0) {
            return res.render('admin/login', {
                title: 'Login Administrador',
                error: '⚠ Usuario o contrasena incorrectos.'
            });
        }

        const user = rows[0];

        // Caso 2a: cuenta pendiente de aprobacion
        if (user.EstadoCuenta === 'pendiente') {
            return res.render('admin/login', {
                title: 'Login Administrador',
                error: '⚠ Tu cuenta esta pendiente de aprobacion.'
            });
        }

        // Caso 2b: cuenta deshabilitada
        if (user.Activo === 0 || user.EstadoCuenta === 'rechazada') {
            return res.render('admin/login', {
                title: 'Login Administrador',
                error: '⚠ Cuenta deshabilitada. Contacta al administrador del sistema.'
            });
        }

        // Caso 3: comparar contrasena con el hash bcrypt almacenado
        const passwordOk = await bcrypt.compare(password, user.Contrasena);

        if (!passwordOk) {
            return res.render('admin/login', {
                title: 'Login Administrador',
                error: '⚠ Usuario o contrasena incorrectos.'
            });
        }

        // Login exitoso: guardar datos en la sesion
        req.session.userId = user.IdUsuario;
        req.session.userName = user.Nombre;
        req.session.role = user.Rol;

        return res.redirect('/admin/dashboard');
    } catch (err) {
        console.error('❌ Error en login de administrador:', err.message);
        return res.status(500).render('shared/error', {
            title: 'Error del servidor',
            message: 'Ocurrio un error al procesar el inicio de sesion. Intenta de nuevo.'
        });
    }
}

// Cerrar sesion
function logout(req, res) {
    req.session.destroy(err => {
        if (err) {
            console.error('Error al cerrar sesion:', err);
        }
        res.redirect('/admin/login');
    });
}

// Mostrar dashboard del administrador con metricas y proximos eventos
async function showDashboard(req, res) {
    try {
        // 4 metricas clave (en paralelo)
        const [
            [solicitudesPendientes],
            [propuestasPendientes],
            [eventosProximos],
            [ponentesActivos]
        ] = await Promise.all([
            pool.query("SELECT COUNT(*) AS total FROM Usuarios WHERE Rol = 'ponente' AND EstadoCuenta = 'pendiente'"),
            pool.query("SELECT COUNT(*) AS total FROM Propuestas WHERE Estado = 'pendiente'"),
            pool.query("SELECT COUNT(*) AS total FROM Eventos WHERE FechaDefinitiva >= CURDATE() AND Estado = 'activo'"),
            pool.query("SELECT COUNT(*) AS total FROM Usuarios WHERE Rol = 'ponente' AND EstadoCuenta = 'aprobada' AND Activo = 1")
        ]);

        // Lista de proximos 5 eventos
        const [proximosEventos] = await pool.query(
            `SELECT
                e.IdEvento, e.IdPropuesta, e.FechaDefinitiva, e.HoraInicio, e.HoraFin, e.Lugar, e.CupoMaximo,
                p.Tema, p.NombreEmpresa,
                u.Nombre AS PonenteNombre
             FROM Eventos e
             JOIN Propuestas p ON p.IdPropuesta = e.IdPropuesta
             JOIN Usuarios u ON u.IdUsuario = e.IdPonente
             WHERE e.FechaDefinitiva >= CURDATE() AND e.Estado = 'activo'
             ORDER BY e.FechaDefinitiva ASC, e.HoraInicio ASC
             LIMIT 5`
        );

        res.render('admin/dashboard', {
            title: 'Panel Administrador',
            session: req.session,
            metricas: {
                solicitudesPendientes: solicitudesPendientes[0].total,
                propuestasPendientes: propuestasPendientes[0].total,
                eventosProximos: eventosProximos[0].total,
                ponentesActivos: ponentesActivos[0].total
            },
            proximosEventos,
            formatDate
        });
    } catch (err) {
        console.error('❌ Error al cargar dashboard del admin:', err.message);
        res.status(500).render('shared/error', {
            code: 500,
            title: 'Error del servidor',
            message: 'No se pudo cargar el panel de administracion.'
        });
    }
}

// Mostrar calendario mes a mes con los eventos
async function showCalendar(req, res) {
    try {
        const today = new Date();

        // Mes/anio desde query string (default: mes actual)
        const mes = parseInt(req.query.mes, 10) || (today.getMonth() + 1);
        const anio = parseInt(req.query.anio, 10) || today.getFullYear();

        if (mes < 1 || mes > 12 || anio < 2020 || anio > 2100) {
            return res.redirect('/admin/calendar');
        }

        // Primer y ultimo dia del mes
        const primerDiaDate = new Date(anio, mes - 1, 1);
        const ultimoDiaDate = new Date(anio, mes, 0);
        const diasMes = ultimoDiaDate.getDate();

        // Primer dia de la semana (ajustado a lunes = 0, domingo = 6)
        let primerDiaSemana = primerDiaDate.getDay();
        primerDiaSemana = primerDiaSemana === 0 ? 6 : primerDiaSemana - 1;

        // Formato YYYY-MM-DD para queries
        const fmt = (d) => d.toISOString().split('T')[0];

        // Eventos del mes (activos y cancelados, para mostrar todos)
        const [eventos] = await pool.query(
            `SELECT
                e.IdEvento, e.IdPropuesta, e.FechaDefinitiva, e.HoraInicio, e.HoraFin,
                e.Lugar, e.CupoMaximo, e.Estado AS EstadoEvento,
                p.Tema,
                u.Nombre AS PonenteNombre
             FROM Eventos e
             JOIN Propuestas p ON p.IdPropuesta = e.IdPropuesta
             JOIN Usuarios u ON u.IdUsuario = e.IdPonente
             WHERE e.FechaDefinitiva BETWEEN ? AND ?
             ORDER BY e.FechaDefinitiva, e.HoraInicio`,
            [fmt(primerDiaDate), fmt(ultimoDiaDate)]
        );

        // Agrupar por dia del mes
        const eventosPorDia = {};
        eventos.forEach(e => {
            const dia = new Date(e.FechaDefinitiva).getDate();
            if (!eventosPorDia[dia]) eventosPorDia[dia] = [];
            eventosPorDia[dia].push(e);
        });

        // Navegacion prev/next mes
        const prevMes = mes === 1 ? 12 : mes - 1;
        const prevAnio = mes === 1 ? anio - 1 : anio;
        const nextMes = mes === 12 ? 1 : mes + 1;
        const nextAnio = mes === 12 ? anio + 1 : anio;

        res.render('admin/calendar', {
            title: 'Calendario de eventos',
            session: req.session,
            mes, anio,
            primerDiaSemana, diasMes,
            eventosPorDia,
            totalEventos: eventos.length,
            nav: { prevMes, prevAnio, nextMes, nextAnio },
            hoy: today.getDate(),
            esMesActual: today.getMonth() + 1 === mes && today.getFullYear() === anio
        });
    } catch (err) {
        console.error('❌ Error al cargar calendario:', err.message);
        res.status(500).render('shared/error', {
            code: 500,
            title: 'Error del servidor',
            message: 'No se pudo cargar el calendario.'
        });
    }
}

// ============================================
// GESTION DE PROPUESTAS (Ponencias)
// ============================================

// Helper: formato amigable de fecha
function formatDate(d) {
    if (!d) return '';
    const date = (d instanceof Date) ? d : new Date(d);
    return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Listar TODAS las propuestas del sistema con filtros
async function showPropuestas(req, res) {
    const filtroEstado = req.query.estado || 'pendiente';

    try {
        let whereClause = '';
        let params = [];
        if (filtroEstado !== 'todas') {
            whereClause = 'WHERE p.Estado = ?';
            params.push(filtroEstado);
        }

        const [propuestas] = await pool.query(
            `SELECT
                p.IdPropuesta, p.NombreEmpresa, p.Tema, p.AlcanceEsperado,
                p.FechaTentativa, p.Estado, p.FechaEnvio,
                u.Nombre AS PonenteNombre, u.Correo AS PonenteCorreo,
                (SELECT COUNT(*) FROM DocumentosPropuesta WHERE IdPropuesta = p.IdPropuesta) AS NumDocumentos
             FROM Propuestas p
             JOIN Usuarios u ON u.IdUsuario = p.IdPonente
             ${whereClause}
             ORDER BY p.FechaEnvio DESC`,
            params
        );

        // Conteos por estado para los tabs
        const [counts] = await pool.query(
            `SELECT Estado, COUNT(*) AS Total FROM Propuestas GROUP BY Estado`
        );

        const conteo = { pendiente: 0, aprobada: 0, rechazada: 0, cancelada: 0, total: 0 };
        counts.forEach(c => {
            conteo[c.Estado] = c.Total;
            conteo.total += c.Total;
        });

        res.render('admin/propuestas-lista', {
            title: 'Propuestas de eventos',
            session: req.session,
            propuestas,
            conteo,
            filtroEstado,
            formatDate
        });
    } catch (err) {
        console.error('❌ Error al cargar propuestas:', err.message);
        res.status(500).render('shared/error', { code: 500, title: 'Error del servidor', message: 'No se pudieron cargar las propuestas.' });
    }
}

// Ver detalle de una propuesta para revisarla
async function showPropuestaReview(req, res) {
    const idPropuesta = parseInt(req.params.id, 10);
    if (isNaN(idPropuesta)) {
        return res.status(404).render('shared/error', { code: 404, title: 'No encontrada', message: 'Propuesta no encontrada.' });
    }

    try {
        const [propuestas] = await pool.query(
            `SELECT
                p.*,
                u.Nombre AS PonenteNombre, u.Correo AS PonenteCorreo,
                e.IdEvento, e.FechaDefinitiva, e.HoraInicio, e.HoraFin, e.Lugar, e.CupoMaximo,
                e.Estado AS EstadoEvento, e.MotivoCancelacion
             FROM Propuestas p
             JOIN Usuarios u ON u.IdUsuario = p.IdPonente
             LEFT JOIN Eventos e ON e.IdPropuesta = p.IdPropuesta
             WHERE p.IdPropuesta = ?`,
            [idPropuesta]
        );

        if (propuestas.length === 0) {
            return res.status(404).render('shared/error', { code: 404, title: 'No encontrada', message: 'Esta propuesta no existe.' });
        }

        const [documentos] = await pool.query(
            'SELECT * FROM DocumentosPropuesta WHERE IdPropuesta = ? ORDER BY FechaSubida',
            [idPropuesta]
        );

        res.render('admin/propuesta-revisar', {
            title: propuestas[0].Tema,
            session: req.session,
            propuesta: propuestas[0],
            documentos,
            formatDate,
            error: null
        });
    } catch (err) {
        console.error('❌ Error al cargar propuesta:', err.message);
        res.status(500).render('shared/error', { code: 500, title: 'Error del servidor', message: 'No se pudo cargar la propuesta.' });
    }
}

// Aprobar propuesta: crear el Evento y marcar Propuesta como 'aprobada'
async function aprobarPropuesta(req, res) {
    const idPropuesta = parseInt(req.params.id, 10);
    if (isNaN(idPropuesta)) {
        return res.status(404).render('shared/error', { code: 404, title: 'No encontrada', message: 'Propuesta no encontrada.' });
    }

    const { fechaDefinitiva, horaInicio, horaFin, lugar, cupoMaximo } = req.body;

    // Validaciones
    const errores = [];
    if (!fechaDefinitiva) errores.push('La fecha definitiva es obligatoria.');
    else {
        const fecha = new Date(fechaDefinitiva);
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        if (fecha < hoy) errores.push('La fecha definitiva debe ser hoy o futura.');
    }

    if (!horaInicio) errores.push('La hora de inicio es obligatoria.');
    if (!horaFin) errores.push('La hora de fin es obligatoria.');
    if (horaInicio && horaFin && horaInicio >= horaFin) {
        errores.push('La hora de fin debe ser posterior a la de inicio.');
    }

    if (!lugar || lugar.trim() === '') errores.push('El lugar es obligatorio.');

    const cupoNum = parseInt(cupoMaximo, 10);
    if (isNaN(cupoNum) || cupoNum <= 0) errores.push('El cupo máximo debe ser mayor a 0.');

    if (errores.length > 0) {
        // Recargar la vista con errores
        const [propuestas] = await pool.query(
            `SELECT p.*, u.Nombre AS PonenteNombre, u.Correo AS PonenteCorreo
             FROM Propuestas p JOIN Usuarios u ON u.IdUsuario = p.IdPonente
             WHERE p.IdPropuesta = ?`,
            [idPropuesta]
        );
        const [documentos] = await pool.query(
            'SELECT * FROM DocumentosPropuesta WHERE IdPropuesta = ?',
            [idPropuesta]
        );
        return res.render('admin/propuesta-revisar', {
            title: propuestas[0]?.Tema || 'Revisar propuesta',
            session: req.session,
            propuesta: { ...propuestas[0], ...req.body },
            documentos,
            formatDate,
            error: errores.join(' ')
        });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // Verificar que la propuesta existe y esta pendiente
        const [propuestas] = await conn.query(
            'SELECT IdPropuesta, IdPonente, Estado FROM Propuestas WHERE IdPropuesta = ?',
            [idPropuesta]
        );

        if (propuestas.length === 0) {
            await conn.rollback();
            return res.status(404).render('shared/error', { code: 404, title: 'No encontrada', message: 'Propuesta no encontrada.' });
        }

        if (propuestas[0].Estado !== 'pendiente') {
            await conn.rollback();
            return res.status(403).render('shared/error', { code: 403, title: 'No procesable', message: 'Solo se pueden aprobar propuestas en estado pendiente.' });
        }

        // Validar conflicto de lugar+fecha+horario con otros eventos activos
        const [conflictos] = await conn.query(
            `SELECT e.IdEvento, e.HoraInicio, e.HoraFin, p.Tema
             FROM Eventos e
             JOIN Propuestas p ON p.IdPropuesta = e.IdPropuesta
             WHERE e.Lugar = ? AND e.FechaDefinitiva = ? AND e.Estado = 'activo'
               AND NOT (e.HoraFin <= ? OR e.HoraInicio >= ?)`,
            [lugar.trim(), fechaDefinitiva, horaInicio, horaFin]
        );

        if (conflictos.length > 0) {
            await conn.rollback();
            const [propuestasError] = await pool.query(
                `SELECT p.*, u.Nombre AS PonenteNombre, u.Correo AS PonenteCorreo
                 FROM Propuestas p JOIN Usuarios u ON u.IdUsuario = p.IdPonente
                 WHERE p.IdPropuesta = ?`,
                [idPropuesta]
            );
            const [documentos] = await pool.query(
                'SELECT * FROM DocumentosPropuesta WHERE IdPropuesta = ?',
                [idPropuesta]
            );
            return res.render('admin/propuesta-revisar', {
                title: propuestasError[0]?.Tema,
                session: req.session,
                propuesta: { ...propuestasError[0], ...req.body },
                documentos,
                formatDate,
                error: 'Conflicto de horario: el lugar "' + lugar + '" ya tiene un evento ("' + conflictos[0].Tema + '") entre ' + conflictos[0].HoraInicio + ' y ' + conflictos[0].HoraFin + ' en esa fecha.'
            });
        }

        // 1. Crear el Evento
        await conn.query(
            `INSERT INTO Eventos
                (IdPropuesta, IdPonente, FechaDefinitiva, HoraInicio, HoraFin, Lugar, CupoMaximo, Estado)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'activo')`,
            [idPropuesta, propuestas[0].IdPonente, fechaDefinitiva, horaInicio, horaFin, lugar.trim(), cupoNum]
        );

        // 2. Marcar la propuesta como aprobada
        await conn.query(
            "UPDATE Propuestas SET Estado = 'aprobada' WHERE IdPropuesta = ?",
            [idPropuesta]
        );

        await conn.commit();
        return res.redirect('/admin/propuestas');
    } catch (err) {
        await conn.rollback();
        console.error('❌ Error al aprobar propuesta:', err.message);
        return res.status(500).render('shared/error', { code: 500, title: 'Error del servidor', message: 'No se pudo aprobar la propuesta.' });
    } finally {
        conn.release();
    }
}

// ============================================
// EDITAR Y CANCELAR EVENTO APROBADO
// ============================================

// Helper: cargar un evento por su ID con datos relacionados
async function getEventoConDetalles(idEvento) {
    const [rows] = await pool.query(
        `SELECT
            e.*,
            p.Tema, p.IdPropuesta, p.NombreEmpresa,
            u.Nombre AS PonenteNombre, u.Correo AS PonenteCorreo
         FROM Eventos e
         JOIN Propuestas p ON p.IdPropuesta = e.IdPropuesta
         JOIN Usuarios u ON u.IdUsuario = e.IdPonente
         WHERE e.IdEvento = ?`,
        [idEvento]
    );
    return rows.length > 0 ? rows[0] : null;
}

// Mostrar formulario de edicion del evento
async function showEventEditForm(req, res) {
    const idEvento = parseInt(req.params.id, 10);
    if (isNaN(idEvento)) {
        return res.status(404).render('shared/error', { code: 404, title: 'No encontrado', message: 'Evento no encontrado.' });
    }

    try {
        const evento = await getEventoConDetalles(idEvento);
        if (!evento) {
            return res.status(404).render('shared/error', { code: 404, title: 'No encontrado', message: 'Evento no encontrado.' });
        }

        if (evento.Estado !== 'activo') {
            return res.status(403).render('shared/error', {
                code: 403,
                title: 'No editable',
                message: 'No se puede editar un evento cancelado.'
            });
        }

        // Formatear fecha para input[type=date]
        if (evento.FechaDefinitiva) {
            evento.FechaDefinitiva = new Date(evento.FechaDefinitiva).toISOString().split('T')[0];
        }

        res.render('admin/evento-editar', {
            title: 'Editar evento',
            session: req.session,
            evento,
            error: null
        });
    } catch (err) {
        console.error('❌ Error al cargar formulario de edicion de evento:', err.message);
        res.status(500).render('shared/error', { code: 500, title: 'Error del servidor', message: 'No se pudo cargar el evento.' });
    }
}

// Actualizar evento
async function updateEvent(req, res) {
    const idEvento = parseInt(req.params.id, 10);
    if (isNaN(idEvento)) {
        return res.status(404).render('shared/error', { code: 404, title: 'No encontrado', message: 'Evento no encontrado.' });
    }

    const { fechaDefinitiva, horaInicio, horaFin, lugar, cupoMaximo } = req.body;

    // Validaciones (mismas que en aprobar)
    const errores = [];
    if (!fechaDefinitiva) errores.push('La fecha definitiva es obligatoria.');
    else {
        const fecha = new Date(fechaDefinitiva);
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        if (fecha < hoy) errores.push('La fecha definitiva debe ser hoy o futura.');
    }
    if (!horaInicio) errores.push('La hora de inicio es obligatoria.');
    if (!horaFin) errores.push('La hora de fin es obligatoria.');
    if (horaInicio && horaFin && horaInicio >= horaFin) errores.push('La hora de fin debe ser posterior a la de inicio.');
    if (!lugar || lugar.trim() === '') errores.push('El lugar es obligatorio.');
    const cupoNum = parseInt(cupoMaximo, 10);
    if (isNaN(cupoNum) || cupoNum <= 0) errores.push('El cupo máximo debe ser mayor a 0.');

    if (errores.length > 0) {
        const evento = await getEventoConDetalles(idEvento);
        return res.render('admin/evento-editar', {
            title: 'Editar evento',
            session: req.session,
            evento: { ...evento, ...req.body },
            error: errores.join(' ')
        });
    }

    try {
        // Validar que el evento existe y esta activo
        const evento = await getEventoConDetalles(idEvento);
        if (!evento) {
            return res.status(404).render('shared/error', { code: 404, title: 'No encontrado', message: 'Evento no encontrado.' });
        }
        if (evento.Estado !== 'activo') {
            return res.status(403).render('shared/error', { code: 403, title: 'No editable', message: 'No se puede editar un evento cancelado.' });
        }

        // Validar conflicto de horario con OTROS eventos activos (excluyendo este)
        const [conflictos] = await pool.query(
            `SELECT e.IdEvento, e.HoraInicio, e.HoraFin, p.Tema
             FROM Eventos e
             JOIN Propuestas p ON p.IdPropuesta = e.IdPropuesta
             WHERE e.Lugar = ? AND e.FechaDefinitiva = ? AND e.Estado = 'activo'
               AND e.IdEvento <> ?
               AND NOT (e.HoraFin <= ? OR e.HoraInicio >= ?)`,
            [lugar.trim(), fechaDefinitiva, idEvento, horaInicio, horaFin]
        );

        if (conflictos.length > 0) {
            return res.render('admin/evento-editar', {
                title: 'Editar evento',
                session: req.session,
                evento: { ...evento, ...req.body },
                error: 'Conflicto de horario: el lugar "' + lugar + '" ya tiene un evento ("' + conflictos[0].Tema + '") entre ' + conflictos[0].HoraInicio + ' y ' + conflictos[0].HoraFin + ' en esa fecha.'
            });
        }

        await pool.query(
            `UPDATE Eventos
             SET FechaDefinitiva = ?, HoraInicio = ?, HoraFin = ?, Lugar = ?, CupoMaximo = ?
             WHERE IdEvento = ?`,
            [fechaDefinitiva, horaInicio, horaFin, lugar.trim(), cupoNum, idEvento]
        );

        return res.redirect('/admin/propuestas/' + evento.IdPropuesta);
    } catch (err) {
        console.error('❌ Error al actualizar evento:', err.message);
        return res.status(500).render('shared/error', { code: 500, title: 'Error del servidor', message: 'No se pudo actualizar el evento.' });
    }
}

// Cancelar evento aprobado con motivo
async function cancelEvent(req, res) {
    const idEvento = parseInt(req.params.id, 10);
    if (isNaN(idEvento)) {
        return res.status(404).render('shared/error', { code: 404, title: 'No encontrado', message: 'Evento no encontrado.' });
    }

    const { motivoCancelacion } = req.body;

    if (!motivoCancelacion || motivoCancelacion.trim() === '') {
        return res.status(400).render('shared/error', { code: 400, title: 'Motivo requerido', message: 'Debes indicar un motivo para cancelar el evento.' });
    }

    try {
        const evento = await getEventoConDetalles(idEvento);
        if (!evento) {
            return res.status(404).render('shared/error', { code: 404, title: 'No encontrado', message: 'Evento no encontrado.' });
        }
        if (evento.Estado !== 'activo') {
            return res.status(403).render('shared/error', { code: 403, title: 'Ya cancelado', message: 'Este evento ya esta cancelado.' });
        }

        await pool.query(
            "UPDATE Eventos SET Estado = 'cancelado', MotivoCancelacion = ? WHERE IdEvento = ?",
            [motivoCancelacion.trim(), idEvento]
        );

        return res.redirect('/admin/propuestas/' + evento.IdPropuesta);
    } catch (err) {
        console.error('❌ Error al cancelar evento:', err.message);
        return res.status(500).render('shared/error', { code: 500, title: 'Error del servidor', message: 'No se pudo cancelar el evento.' });
    }
}

// Descargar/visualizar un documento adjunto (validado por sesion admin)
async function descargarDocumento(req, res) {
    const idPropuesta = parseInt(req.params.id, 10);
    const idDocumento = parseInt(req.params.docId, 10);
    if (isNaN(idPropuesta) || isNaN(idDocumento)) {
        return res.status(404).render('shared/error', { code: 404, title: 'No encontrado', message: 'Documento no encontrado.' });
    }

    try {
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
            return res.status(404).render('shared/error', { code: 404, title: 'No encontrado', message: 'El archivo no esta disponible en el servidor.' });
        }

        // Permite que el navegador intente abrirlo inline (PDF) o lo descargue (Word/PPT)
        const ext = path.extname(doc.NombreOriginal).toLowerCase();
        if (ext === '.pdf') {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'inline; filename="' + encodeURIComponent(doc.NombreOriginal) + '"');
            return fs.createReadStream(filePath).pipe(res);
        }
        return res.download(filePath, doc.NombreOriginal);
    } catch (err) {
        console.error('❌ Error al descargar documento (admin):', err.message);
        return res.status(500).render('shared/error', { code: 500, title: 'Error del servidor', message: 'No se pudo descargar el archivo.' });
    }
}

// Rechazar propuesta con motivo
async function rechazarPropuesta(req, res) {
    const idPropuesta = parseInt(req.params.id, 10);
    if (isNaN(idPropuesta)) {
        return res.status(404).render('shared/error', { code: 404, title: 'No encontrada', message: 'Propuesta no encontrada.' });
    }

    const { motivoRechazo } = req.body;

    if (!motivoRechazo || motivoRechazo.trim() === '') {
        // Volver al detalle con error
        const [propuestas] = await pool.query(
            `SELECT p.*, u.Nombre AS PonenteNombre, u.Correo AS PonenteCorreo
             FROM Propuestas p JOIN Usuarios u ON u.IdUsuario = p.IdPonente
             WHERE p.IdPropuesta = ?`,
            [idPropuesta]
        );
        const [documentos] = await pool.query(
            'SELECT * FROM DocumentosPropuesta WHERE IdPropuesta = ?',
            [idPropuesta]
        );
        return res.render('admin/propuesta-revisar', {
            title: propuestas[0]?.Tema,
            session: req.session,
            propuesta: propuestas[0],
            documentos,
            formatDate,
            error: 'Debes indicar un motivo para rechazar la propuesta.'
        });
    }

    try {
        const [result] = await pool.query(
            "UPDATE Propuestas SET Estado = 'rechazada', MotivoRechazo = ? WHERE IdPropuesta = ? AND Estado = 'pendiente'",
            [motivoRechazo.trim(), idPropuesta]
        );

        if (result.affectedRows === 0) {
            return res.status(403).render('shared/error', { code: 403, title: 'No procesable', message: 'Solo se pueden rechazar propuestas en estado pendiente.' });
        }

        return res.redirect('/admin/propuestas');
    } catch (err) {
        console.error('❌ Error al rechazar propuesta:', err.message);
        return res.status(500).render('shared/error', { code: 500, title: 'Error del servidor', message: 'No se pudo rechazar la propuesta.' });
    }
}

// ============================================
// Gestion de ponentes (solicitudes y desactivacion)
// ============================================

async function showSolicitudes(req, res) {
    try {
        const [pendientes] = await pool.query(
            `SELECT IdUsuario, Nombre, Correo, FechaRegistro
             FROM Usuarios
             WHERE Rol = 'ponente' AND EstadoCuenta = 'pendiente'
             ORDER BY FechaRegistro ASC`
        );

        const [aprobados] = await pool.query(
            `SELECT IdUsuario, Nombre, Correo, FechaRegistro, Activo
             FROM Usuarios
             WHERE Rol = 'ponente' AND EstadoCuenta = 'aprobada'
             ORDER BY FechaRegistro DESC`
        );

        res.render('admin/solicitudes-ponentes', {
            title: 'Solicitudes de ponentes',
            session: req.session,
            pendientes,
            aprobados
        });
    } catch (err) {
        console.error('❌ Error al cargar solicitudes:', err.message);
        res.status(500).render('shared/error', { code: 500, title: 'Error del servidor', message: 'No se pudieron cargar las solicitudes.' });
    }
}

async function aprobarPonente(req, res) {
    const idUsuario = parseInt(req.params.id, 10);
    if (isNaN(idUsuario)) return res.redirect('/admin/solicitudes');

    try {
        await pool.query(
            "UPDATE Usuarios SET EstadoCuenta = 'aprobada' WHERE IdUsuario = ? AND Rol = 'ponente' AND EstadoCuenta = 'pendiente'",
            [idUsuario]
        );
        return res.redirect('/admin/solicitudes');
    } catch (err) {
        console.error('❌ Error al aprobar ponente:', err.message);
        return res.status(500).render('shared/error', { code: 500, title: 'Error del servidor', message: 'No se pudo aprobar la solicitud.' });
    }
}

async function rechazarPonente(req, res) {
    const idUsuario = parseInt(req.params.id, 10);
    if (isNaN(idUsuario)) return res.redirect('/admin/solicitudes');

    try {
        // Eliminar el usuario (asi el correo queda libre para reintentar)
        await pool.query(
            "DELETE FROM Usuarios WHERE IdUsuario = ? AND Rol = 'ponente' AND EstadoCuenta = 'pendiente'",
            [idUsuario]
        );
        return res.redirect('/admin/solicitudes');
    } catch (err) {
        console.error('❌ Error al rechazar ponente:', err.message);
        return res.status(500).render('shared/error', { code: 500, title: 'Error del servidor', message: 'No se pudo rechazar la solicitud.' });
    }
}

async function desactivarPonente(req, res) {
    const idUsuario = parseInt(req.params.id, 10);
    if (isNaN(idUsuario)) return res.redirect('/admin/solicitudes');

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // 1. Marcar ponente como inactivo
        await conn.query(
            "UPDATE Usuarios SET Activo = 0 WHERE IdUsuario = ? AND Rol = 'ponente'",
            [idUsuario]
        );

        // 2. Cancelar propuestas pendientes del ponente
        await conn.query(
            "UPDATE Propuestas SET Estado = 'cancelada' WHERE IdPonente = ? AND Estado IN ('pendiente', 'aprobada')",
            [idUsuario]
        );

        // 3. Cancelar eventos activos del ponente
        await conn.query(
            "UPDATE Eventos SET Estado = 'cancelado', MotivoCancelacion = 'Ponente desactivado por el administrador' WHERE IdPonente = ? AND Estado = 'activo'",
            [idUsuario]
        );

        await conn.commit();
        return res.redirect('/admin/solicitudes');
    } catch (err) {
        await conn.rollback();
        console.error('❌ Error al desactivar ponente:', err.message);
        return res.status(500).render('shared/error', { code: 500, title: 'Error del servidor', message: 'No se pudo desactivar al ponente.' });
    } finally {
        conn.release();
    }
}

module.exports = {
    showLogin,
    login,
    logout,
    showDashboard,
    showCalendar,
    showPropuestas,
    showPropuestaReview,
    aprobarPropuesta,
    rechazarPropuesta,
    descargarDocumento,
    showEventEditForm,
    updateEvent,
    cancelEvent,
    showSolicitudes,
    aprobarPonente,
    rechazarPonente,
    desactivarPonente
};

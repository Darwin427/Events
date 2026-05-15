// Carga las variables de entorno desde .env (debe ir antes de cualquier otra cosa)
require('dotenv').config();

const express = require('express');
const session = require('express-session');
const path = require('path');
const bodyParser = require('body-parser');
const { connectToDatabase } = require('./src/config/database');

// Importar rutas organizadas por rol
const sharedRoutes = require('./src/routes/shared/sharedRoutes');
const adminRoutes = require('./src/routes/admin/adminRoutes');
const asistenteRoutes = require('./src/routes/asistente/asistenteRoutes');
const ponenteRoutes = require('./src/routes/ponente/ponenteRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: process.env.SESSION_SECRET || 'eventos-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// Middleware de flash messages (notificaciones toast)
// Lee req.session.flash, lo pasa a las vistas y lo borra para que solo se vea una vez.
app.use((req, res, next) => {
    res.locals.flash = req.session.flash || null;
    if (req.session.flash) delete req.session.flash;
    next();
});

// Configuración de EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Usar rutas organizadas por rol
app.use('/', sharedRoutes);
app.use('/admin', adminRoutes);
app.use('/asistente', asistenteRoutes);
app.use('/ponente', ponenteRoutes);

// Manejo de errores 404
app.use((req, res) => {
    res.status(404).render('shared/error', {
        code: 404,
        title: 'Página no encontrada',
        message: 'La página que buscas no existe.'
    });
});

// Manejo de errores 500
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('shared/error', {
        code: 500,
        title: 'Error del servidor',
        message: 'Ha ocurrido un error en el servidor.'
    });
});

// Iniciar servidor (validando conexion a MySQL antes de aceptar requests)
async function startServer() {
    try {
        await connectToDatabase();

        app.listen(PORT, () => {
            console.log('');
            console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
            console.log('📁 Rutas:');
            console.log(`   🏠 Inicio:    http://localhost:${PORT}/inicio`);
            console.log(`   👨‍💼 Admin:     http://localhost:${PORT}/admin/login`);
            console.log(`   👤 Asistente: http://localhost:${PORT}/asistente/login`);
            console.log(`   🎤 Ponente:   http://localhost:${PORT}/ponente/login`);
            console.log('');
        });
    } catch (err) {
        console.error('');
        console.error('❌ El servidor no pudo arrancar por un error de conexion a la base.');
        console.error('   Revisa tu archivo .env y que MySQL este corriendo.');
        console.error('');
        process.exit(1);
    }
}

startServer();

module.exports = app;

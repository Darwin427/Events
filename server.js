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
    secret: 'eventos-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// Configuración de EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Usar rutas organizadas por rol
app.use('/', sharedRoutes);
app.use('/admin', adminRoutes);
app.use('/asistente', asistenteRoutes);
app.use('/ponente', ponenteRoutes);

// Rutas legacy para compatibilidad temporal
app.get('/administrador', (req, res) => res.redirect('/admin/login'));
app.get('/asistente', (req, res) => res.redirect('/asistente/login'));
app.get('/ponente', (req, res) => res.redirect('/ponente/login'));
app.get('/principal/admon', (req, res) => res.redirect('/admin/dashboard'));
app.get('/principal/asistente', (req, res) => res.redirect('/asistente/dashboard'));
app.get('/principal/ponente', (req, res) => res.redirect('/ponente/dashboard'));

// Manejo de errores 404
app.use((req, res) => {
    res.status(404).render('shared/error', { 
        title: 'Página no encontrada',
        message: 'La página que buscas no existe.' 
    });
});

// Manejo de errores 500
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('shared/error', { 
        title: 'Error del servidor',
        message: 'Ha ocurrido un error en el servidor.' 
    });
});

// Iniciar servidor (temporalmente sin conexión a BD para demostración)
console.log('Iniciando servidor en modo demostración (sin conexión a BD)...');
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log('🏗️ Estructura organizada por roles implementada');
    console.log('📁 Rutas:');
    console.log('   🏠 Inicio: http://localhost:3000/inicio');
    console.log('   👨‍💼 Admin: http://localhost:3000/admin/login');
    console.log('   👤 Asistente: http://localhost:3000/asistente/login');
    console.log('   🎤 Ponente: http://localhost:3000/ponente/login');
    console.log('⚠️  Modo demostración: Sin conexión a base de datos');
});

module.exports = app;

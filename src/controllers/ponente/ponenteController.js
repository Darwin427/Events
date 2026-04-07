const { mssql } = require('../../config/database');
const { authenticateDemoUser } = require('../../config/demoUsers');

// Mostrar página de login de ponente
function showLogin(req, res) {
    res.render('ponente/login', { 
        title: 'Login Ponente',
        error: null 
    });
}

// Procesar login de ponente
async function login(req, res) {
    try {
        const { email, password } = req.body;
        
        // Modo demostración: usar credenciales predefinidas
        const user = authenticateDemoUser(email, password);
        
        if (user && user.rol.toLowerCase() === 'ponente') {
            req.session.userId = user.idUsuario;
            req.session.role = user.rol;
            res.redirect('/ponente/dashboard');
        } else if (user) {
            res.render('ponente/login', { 
                title: 'Login Ponente',
                error: '⚠ Acceso denegado. No tiene permisos de ponente.' 
            });
        } else {
            res.render('ponente/login', { 
                title: 'Login Ponente',
                error: '⚠ Usuario o contraseña incorrectos.' 
            });
        }
    } catch (err) {
        console.error('Error en login de ponente:', err);
        res.status(500).send('Error del servidor');
    }
}

// Mostrar dashboard del ponente
async function showDashboard(req, res) {
    try {
        // Modo demostración: datos de ejemplo
        const propuestasDemo = [
            {
                IdPonencia: 1,
                NombreEmpresa: 'Tech Solutions S.A.',
                Tema: 'Inteligencia Artificial en la Educación',
                IdeaPrincipal: 'Implementación de IA para personalizar el aprendizaje',
                Vision: 'Transformar la educación mediante tecnología adaptativa',
                AlcanceEsperado: 200,
                FechaTentativa: '2024-06-15',
                Estado: 'Pendiente'
            },
            {
                IdPonencia: 2,
                NombreEmpresa: 'Innovation Labs',
                Tema: 'Realidad Virtual en Entornos Educativos',
                IdeaPrincipal: 'Crear experiencias inmersivas para estudiantes',
                Vision: 'Revolucionar el aprendizaje mediante VR/AR',
                AlcanceEsperado: 150,
                FechaTentativa: '2024-07-20',
                Estado: 'Aprobada'
            }
        ];
        
        res.render('ponente/dashboard', { 
            title: 'Panel Ponente',
            session: req.session,
            propuestas: propuestasDemo,
            mensaje: req.query.success ? 'Propuesta enviada exitosamente' : null,
            mensajeTipo: req.query.success ? 'success' : null
        });
    } catch (err) {
        console.error('Error al cargar dashboard de ponente:', err);
        res.status(500).send('Error del servidor');
    }
}

// Enviar propuesta de evento
async function enviarPropuesta(req, res) {
    try {
        const { 
            companyName, 
            topic, 
            idea, 
            vision, 
            expectedReach, 
            tentativeDate 
        } = req.body;
        
        // Modo demostración: simular guardado exitoso
        console.log('Propuesta recibida:', {
            companyName,
            topic,
            idea,
            vision,
            expectedReach,
            tentativeDate
        });
        
        res.redirect('/ponente/dashboard?success=true');
    } catch (err) {
        console.error('Error al enviar propuesta:', err);
        res.status(500).send('Error del servidor');
    }
}

module.exports = {
    showLogin,
    login,
    showDashboard,
    enviarPropuesta
};

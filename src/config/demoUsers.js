// Credenciales de demostración para pruebas sin base de datos
const demoUsers = [
    {
        email: 'admin@pascualbravo.edu',
        password: 'admin123',
        rol: 'administrador',
        idUsuario: 1
    },
    {
        email: 'asistente@pascualbravo.edu',
        password: 'asistente123',
        rol: 'asistente',
        idUsuario: 2
    },
    {
        email: 'ponente@pascualbravo.edu',
        password: 'ponente123',
        rol: 'ponente',
        idUsuario: 3
    }
];

// Función para autenticar usuario de demostración
function authenticateDemoUser(email, password) {
    return demoUsers.find(user => 
        user.email.toLowerCase() === email.toLowerCase() && 
        user.password === password
    );
}

module.exports = {
    demoUsers,
    authenticateDemoUser
};

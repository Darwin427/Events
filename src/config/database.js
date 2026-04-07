const mssql = require('mssql');

const dbConfig = {
    server: 'LUISC\\SQLEXPRESS',
    database: 'Event_1',
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true
    },
    // Usar autenticación Windows por defecto
    connectionTimeout: 30000,
    requestTimeout: 30000
};

// Función para conectar a la base de datos
async function connectToDatabase() {
    try {
        await mssql.connect(dbConfig);
        console.log('Conectado a SQL Server');
        return mssql;
    } catch (err) {
        console.error('Error de conexión a la base de datos:', err);
        throw err;
    }
}

module.exports = {
    dbConfig,
    connectToDatabase,
    mssql
};

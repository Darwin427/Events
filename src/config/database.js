// ============================================
// Configuracion de la base de datos MySQL
// Usa mysql2/promise con pool de conexiones
// Las credenciales se cargan desde el archivo .env
// ============================================

const mysql = require('mysql2/promise');

// Pool de conexiones - reutiliza conexiones para mejor rendimiento
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
    timezone: 'local'
});

/**
 * Valida la conexion a la base de datos al arrancar el servidor.
 * Lanza error si la conexion falla, para que el servidor no arranque
 * en estado roto.
 */
async function connectToDatabase() {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query('SELECT VERSION() AS version, DATABASE() AS db');
        console.log('✅ Conectado a MySQL');
        console.log(`   Version: ${rows[0].version}`);
        console.log(`   Base:    ${rows[0].db}`);
        console.log(`   Host:    ${process.env.DB_HOST}:${process.env.DB_PORT}`);
        connection.release();
        return pool;
    } catch (err) {
        console.error('❌ Error de conexion a MySQL:', err.message);
        if (err.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('   Verifica DB_USER y DB_PASSWORD en tu archivo .env');
        } else if (err.code === 'ER_BAD_DB_ERROR') {
            console.error(`   La base de datos '${process.env.DB_NAME}' no existe`);
        } else if (err.code === 'ECONNREFUSED') {
            console.error('   ¿Esta corriendo el servidor MySQL? Revisa DB_HOST y DB_PORT');
        }
        throw err;
    }
}

/**
 * Devuelve el pool de conexiones para que los controllers lo usen.
 * Ejemplo de uso en un controller:
 *   const pool = require('../../config/database').pool;
 *   const [rows] = await pool.query('SELECT * FROM Usuarios WHERE IdUsuario = ?', [id]);
 */
function getPool() {
    return pool;
}

module.exports = {
    pool,
    getPool,
    connectToDatabase
};

// ============================================
// Test de conexion a la base de datos MySQL
// Uso: node database/test_connection.js
// ============================================

require('dotenv').config();

const { pool, connectToDatabase } = require('../src/config/database');

async function testConnection() {
    console.log('');
    console.log('🔍 Probando conexion a MySQL...');
    console.log('');

    try {
        // Test 1: validar que la conexion funciona
        await connectToDatabase();

        // Test 2: contar usuarios
        const [usuarios] = await pool.query('SELECT COUNT(*) AS total FROM Usuarios');
        console.log('');
        console.log(`📊 Total de usuarios en la base: ${usuarios[0].total}`);

        // Test 3: buscar el admin
        const [admin] = await pool.query(
            'SELECT IdUsuario, Nombre, Correo, Rol FROM Usuarios WHERE Rol = ?',
            ['administrador']
        );

        if (admin.length > 0) {
            console.log('');
            console.log('👤 Admin encontrado:');
            console.log(`   Id:     ${admin[0].IdUsuario}`);
            console.log(`   Nombre: ${admin[0].Nombre}`);
            console.log(`   Correo: ${admin[0].Correo}`);
        } else {
            console.log('');
            console.log('⚠️  No se encontro ningun administrador en la base.');
        }

        // Test 4: contar registros en cada tabla
        const tablas = ['Usuarios', 'Propuestas', 'DocumentosPropuesta', 'Eventos', 'Inscripciones'];
        console.log('');
        console.log('📋 Conteo de registros por tabla:');
        for (const tabla of tablas) {
            const [result] = await pool.query(`SELECT COUNT(*) AS total FROM ${tabla}`);
            console.log(`   ${tabla.padEnd(22)} ${result[0].total}`);
        }

        console.log('');
        console.log('✅ Todos los tests pasaron. La conexion funciona correctamente.');
        console.log('');

        process.exit(0);
    } catch (err) {
        console.error('');
        console.error('❌ Test de conexion fallo:', err.message);
        console.error('');
        process.exit(1);
    }
}

testConnection();

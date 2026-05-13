-- ============================================
-- FIX: Hash de contrasena del administrador
-- ============================================
-- Problema: El hash original en el script de creacion
--   '$2b$10$92IXUNpkjO0rOQ5byMi...' NO correspondia a 'admin123'
--   sino a la palabra 'password'.
--
-- Este script reemplaza el hash por uno valido para 'admin123'.
-- ============================================

USE events_db;

-- Antes del fix
SELECT IdUsuario, Nombre, Correo, Contrasena, Rol
FROM Usuarios
WHERE Rol = 'administrador';

-- Aplicar el nuevo hash (corresponde a admin123, generado con bcryptjs saltRounds 10)
SET SQL_SAFE_UPDATES = 0;

-- IMPORTANTE: aqui va el HASH bcrypt, NO la contrasena en texto plano.
-- bcrypt.compare() en el controller necesita un hash valido para funcionar.
-- El hash de abajo corresponde a 'admin123' (verificado con bcryptjs saltRounds 10).
UPDATE Usuarios
SET Contrasena = '$2b$10$khQi92qV1EQThAHb8ka7B./IFHZoLwNKFVI/S7MOCtHHwPex2ME66'
WHERE Rol = 'administrador';

SET SQL_SAFE_UPDATES = 1;

-- Verificacion: el hash debe haber cambiado
SELECT IdUsuario, Nombre, Correo, Contrasena, Rol
FROM Usuarios
WHERE Rol = 'administrador';

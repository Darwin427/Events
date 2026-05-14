-- ============================================
-- SEED: Asistente de prueba
-- ============================================
-- Crea un asistente de prueba para validar el login y el dashboard.
--   Correo:        asistente@pascualbravo.edu.co (construido con CHAR)
--   Contrasena:    asistente123 (hash bcrypt verificado)
--   Rol:           asistente
--   EstadoCuenta:  aprobada (los asistentes no requieren aprobacion del admin)
--   Activo:        1
-- ============================================

USE events_db;

INSERT INTO Usuarios (Nombre, Correo, Contrasena, Rol, EstadoCuenta, Activo)
VALUES (
    'Maria Gonzalez',
    CONVERT(
        CHAR(97,115,105,115,116,101,110,116,101,64,112,97,115,99,117,97,108,98,114,97,118,111,46,101,100,117,46,99,111)
        USING utf8mb4
    ),
    '$2b$10$zmzxnPfMXjfFP0rK5sLrrOj1imnIw/RpDWI9QQnIw5lhVv8DdnQo.',
    'asistente',
    'aprobada',
    1
);

-- Verificacion
SELECT
    IdUsuario,
    Nombre,
    Correo,
    LENGTH(Correo) AS largo,
    Rol,
    EstadoCuenta,
    Activo
FROM Usuarios
WHERE Rol = 'asistente';
-- Esperado: 1 fila, correo "asistente@pascualbravo.edu.co", largo = 29

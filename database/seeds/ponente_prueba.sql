-- ============================================
-- SEED: Ponente de prueba aprobado
-- ============================================
-- Crea un ponente de prueba con:
--   Correo:    ponente@pascualbravo.edu.co (construido con CHAR para evitar markdown)
--   Contrasena: ponente123 (hash bcrypt generado con saltRounds 10)
--   Rol:       ponente
--   EstadoCuenta: aprobada
--   Activo:    1
--
-- Esto simula que el admin ya aprobo la solicitud de cuenta.
-- Cuando construyamos el flujo de solicitud/aprobacion real, este seed
-- se vuelve innecesario.
-- ============================================

USE events_db;

INSERT INTO Usuarios (Nombre, Correo, Contrasena, Rol, EstadoCuenta, Activo)
VALUES (
    'Carlos Mendoza',
    CONVERT(
        CHAR(112,111,110,101,110,116,101,64,112,97,115,99,117,97,108,98,114,97,118,111,46,101,100,117,46,99,111)
        USING utf8mb4
    ),
    '$2b$10$2vgZTrD686LfAv6o9WkmG.Xfsxon1uYr0ofe0ruuxHLW.3f3oEmp6',
    'ponente',
    'aprobada',
    1
);

-- Verificacion: debe mostrar el ponente recien creado
SELECT
    IdUsuario,
    Nombre,
    Correo,
    LENGTH(Correo) AS largo,
    Rol,
    EstadoCuenta,
    Activo
FROM Usuarios
WHERE Rol = 'ponente';
-- Esperado: 1 fila, correo "ponente@pascualbravo.edu.co", largo = 27

-- ============================================
-- SEED: Ponente con cuenta PENDIENTE de aprobacion
-- ============================================
-- Crea un segundo ponente que simula una solicitud reciente:
--   Correo:        ponente2@pascualbravo.edu.co (construido con CHAR)
--   Contrasena:    ponente2024 (hash bcrypt verificado)
--   Rol:           ponente
--   EstadoCuenta:  pendiente  <-- el admin debe aprobarlo
--   Activo:        1
--
-- Sirve para probar:
--   1. El flujo "Solicitudes pendientes" en /admin/solicitudes
--   2. Que el login del ponente RECHACE entrar si EstadoCuenta = 'pendiente'
--   3. Que al aprobar, el ponente ya puede entrar
-- ============================================

USE events_db;

INSERT INTO Usuarios (Nombre, Correo, Contrasena, Rol, EstadoCuenta, Activo)
VALUES (
    'Laura Restrepo',
    CONVERT(
        CHAR(112,111,110,101,110,116,101,50,64,112,97,115,99,117,97,108,98,114,97,118,111,46,101,100,117,46,99,111)
        USING utf8mb4
    ),
    '$2b$10$kPgYzLKuTI1yqbVl0li/EuVkv3nBr9gaqymg7UaWiyjAE6W5eqeM2',
    'ponente',
    'pendiente',
    1
);

-- Verificacion: debe mostrar el nuevo ponente
SELECT
    IdUsuario,
    Nombre,
    Correo,
    LENGTH(Correo) AS largo,
    Rol,
    EstadoCuenta,
    Activo
FROM Usuarios
WHERE Rol = 'ponente'
ORDER BY IdUsuario;
-- Esperado: 2 filas (Carlos aprobado, Laura pendiente)
-- Laura: correo "ponente2@pascualbravo.edu.co", largo = 28

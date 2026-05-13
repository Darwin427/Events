-- ============================================
-- VALIDACIÓN CA-07: Pruebas funcionales del schema
-- ============================================
-- Objetivo: Verificar que las constraints, CHECKs e índices del schema
--           rechazan los datos inválidos según los criterios de aceptación.
--
-- Cómo ejecutar:
--   - Ejecuta cada SECCIÓN por separado en MySQL Workbench.
--   - Cada caso tiene un resultado esperado.
--   - Los casos marcados con [ERROR] DEBEN fallar — eso prueba que la
--     constraint funciona correctamente.
-- ============================================

USE events_db;

-- ============================================
-- PREPARACIÓN: Datos de prueba mínimos
-- ============================================
-- Insertamos un ponente y un asistente para poder probar las relaciones.
-- (Si ya existen estos correos, comenta estos INSERTs y reutiliza los IDs)

INSERT INTO Usuarios (Nombre, Correo, Contraseña, Rol)
VALUES ('Ponente Test', 'ponente.test@pascualbravo.edu.co',
        '$2b$10$abcdefghijklmnopqrstuv', 'ponente');

INSERT INTO Usuarios (Nombre, Correo, Contraseña, Rol)
VALUES ('Asistente Test', 'asistente.test@pascualbravo.edu.co',
        '$2b$10$abcdefghijklmnopqrstuv', 'asistente');

-- Insertamos una propuesta y un evento para las pruebas siguientes
SET @id_ponente = (SELECT IdUsuario FROM Usuarios
                   WHERE Correo = 'ponente.test@pascualbravo.edu.co');
SET @id_asistente = (SELECT IdUsuario FROM Usuarios
                     WHERE Correo = 'asistente.test@pascualbravo.edu.co');

INSERT INTO Propuestas (IdPonente, NombreEmpresa, Tema, IdeaPrincipal,
                        Vision, AlcanceEsperado, FechaTentativa)
VALUES (@id_ponente, 'Empresa Test', 'Tema Test',
        'Idea principal de prueba', 'Visión de prueba',
        50, '2026-06-15');

SET @id_propuesta = LAST_INSERT_ID();

INSERT INTO Eventos (IdPropuesta, IdPonente, FechaDefinitiva,
                     HoraInicio, HoraFin, Lugar, CupoMaximo)
VALUES (@id_propuesta, @id_ponente, '2026-06-15',
        '09:00:00', '11:00:00', 'Auditorio Principal', 100);

SET @id_evento = LAST_INSERT_ID();

-- Verificamos que la preparación quedó OK
SELECT 'PREPARACIÓN OK' AS estado,
       @id_ponente AS id_ponente,
       @id_asistente AS id_asistente,
       @id_propuesta AS id_propuesta,
       @id_evento AS id_evento;


-- ============================================
-- CA-03 — Correo único en Usuarios  [DEBE FALLAR]
-- ============================================
-- Esperado: Error 1062 (Duplicate entry) por uq_usuarios_correo
INSERT INTO Usuarios (Nombre, Correo, Contraseña, Rol)
VALUES ('Duplicado', 'ponente.test@pascualbravo.edu.co',
        '$2b$10$xxxxxxxxxxxxxxxxxxxxxx', 'asistente');


-- ============================================
-- CA-03 — Inscripción duplicada del mismo asistente al mismo evento  [DEBE FALLAR]
-- ============================================
-- Primero una inscripción válida (debe pasar)
INSERT INTO Inscripciones (IdAsistente, IdEvento)
VALUES (@id_asistente, @id_evento);

-- Segunda inscripción al mismo evento — debe fallar
-- Esperado: Error 1062 (Duplicate entry) por uq_inscripciones_asistente_evento
INSERT INTO Inscripciones (IdAsistente, IdEvento)
VALUES (@id_asistente, @id_evento);


-- ============================================
-- CA-03 — HoraFin debe ser mayor que HoraInicio  [DEBE FALLAR]
-- ============================================
-- Esperado: Error 3819 (Check constraint violated) por chk_horas_evento
INSERT INTO Eventos (IdPropuesta, IdPonente, FechaDefinitiva,
                     HoraInicio, HoraFin, Lugar, CupoMaximo)
VALUES (@id_propuesta, @id_ponente, '2026-07-15',
        '15:00:00', '14:00:00', 'Salón B', 50);


-- ============================================
-- CA-03 — CupoMaximo > 0  [DEBE FALLAR]
-- ============================================
-- Esperado: Error 3819 (Check constraint violated) por chk_cupo_evento
INSERT INTO Eventos (IdPropuesta, IdPonente, FechaDefinitiva,
                     HoraInicio, HoraFin, Lugar, CupoMaximo)
VALUES (@id_propuesta, @id_ponente, '2026-07-15',
        '09:00:00', '11:00:00', 'Salón B', 0);


-- ============================================
-- CA-03 — Tipo de archivo inválido  [DEBE FALLAR]
-- ============================================
-- Esperado: Error 3819 (Check constraint violated) por chk_tipo_archivo
INSERT INTO DocumentosPropuesta (IdPropuesta, NombreOriginal,
                                 RutaArchivo, TipoArchivo, `TamañoBytes`)
VALUES (@id_propuesta, 'malicioso.exe', '/uploads/x.exe', 'exe', 1024);


-- ============================================
-- CA-03 — Tamaño de archivo > 20MB  [DEBE FALLAR]
-- ============================================
-- Esperado: Error 3819 (Check constraint violated) por chk_tamaño_archivo
-- 25MB = 26214400 bytes (mayor a los 20MB permitidos)
INSERT INTO DocumentosPropuesta (IdPropuesta, NombreOriginal,
                                 RutaArchivo, TipoArchivo, `TamañoBytes`)
VALUES (@id_propuesta, 'enorme.pdf', '/uploads/enorme.pdf', 'pdf', 26214400);


-- ============================================
-- CA-04 — ENUM inválido en Rol  [DEBE FALLAR]
-- ============================================
-- Esperado: Error 1265 (Data truncated for column 'Rol')
INSERT INTO Usuarios (Nombre, Correo, Contraseña, Rol)
VALUES ('Rol Inválido', 'invalido@test.com',
        '$2b$10$xxxxxxxxxxxxxxxxxxxxxx', 'superadmin');


-- ============================================
-- CA-02 — FK: ponente inexistente  [DEBE FALLAR]
-- ============================================
-- Esperado: Error 1452 (Cannot add or update child row: FK constraint)
INSERT INTO Propuestas (IdPonente, NombreEmpresa, Tema, IdeaPrincipal,
                        Vision, AlcanceEsperado, FechaTentativa)
VALUES (999999, 'Empresa Fantasma', 'Tema', 'Idea', 'Visión',
        10, '2026-06-15');


-- ============================================
-- CA-05 — Verificar que los índices existan
-- ============================================
-- Debe listar 6 índices personalizados (más los UNIQUE/PK automáticos)
SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'events_db'
  AND INDEX_NAME LIKE 'idx_%'
ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;


-- ============================================
-- CA-07 — Conteo final de tablas
-- ============================================
-- Debe retornar exactamente 5 tablas
SELECT COUNT(*) AS total_tablas
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'events_db'
  AND TABLE_TYPE = 'BASE TABLE';


-- ============================================
-- LIMPIEZA (OPCIONAL): Borrar los datos de prueba
-- ============================================
-- Descomenta si quieres dejar la base limpia:
-- DELETE FROM Inscripciones WHERE IdAsistente = @id_asistente;
-- DELETE FROM Eventos       WHERE IdPropuesta = @id_propuesta;
-- DELETE FROM Propuestas    WHERE IdPropuesta = @id_propuesta;
-- DELETE FROM Usuarios      WHERE Correo IN (
--   'ponente.test@pascualbravo.edu.co',
--   'asistente.test@pascualbravo.edu.co'
-- );

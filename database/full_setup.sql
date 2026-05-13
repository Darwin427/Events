-- ============================================
-- SISTEMA EVENTS - INSTITUCIÓN UNIVERSITARIA PASCUAL BRAVO
-- ============================================
-- Script de instalacion completo en un solo archivo:
--   1. DROP de la base anterior (si existe)
--   2. CREATE de la base events_db
--   3. CREATE de las 5 tablas con todos sus constraints, FKs e indices
--   4. INSERT del administrador por defecto
--   5. INSERT de 2 ponentes de prueba (Carlos aprobado, Laura pendiente)
--
-- Motor:    MySQL 8+
-- Charset:  utf8mb4
-- Collation: utf8mb4_unicode_ci
--
-- Uso (en MySQL Workbench):
--   File -> Open SQL Script -> seleccionar este archivo -> Ejecutar
--   Tambien funciona desde linea de comandos:
--   mysql -u root -p < full_setup.sql
--
-- IMPORTANTE: este script ELIMINA la base events_db si existe.
-- Si tienes datos importantes, has un backup antes de correrlo.
-- ============================================

DROP DATABASE IF EXISTS events_db;

CREATE DATABASE events_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE events_db;

-- ============================================
-- TABLA: Usuarios
-- ============================================
CREATE TABLE Usuarios (
    IdUsuario       INT             NOT NULL AUTO_INCREMENT,
    Nombre          VARCHAR(100)    NOT NULL,
    Correo          VARCHAR(150)    NOT NULL,
    Contrasena      VARCHAR(255)    NOT NULL,
    Rol             ENUM(
                        'administrador',
                        'ponente',
                        'asistente'
                    )               NOT NULL,
    EstadoCuenta    ENUM(
                        'pendiente',
                        'aprobada',
                        'rechazada'
                    )               NOT NULL DEFAULT 'aprobada',
    FechaRegistro   DATETIME        NOT NULL DEFAULT NOW(),
    Activo          TINYINT(1)      NOT NULL DEFAULT 1,
    CONSTRAINT pk_usuarios
        PRIMARY KEY (IdUsuario),
    CONSTRAINT uq_usuarios_correo
        UNIQUE (Correo)
);

-- ============================================
-- TABLA: Propuestas
-- ============================================
CREATE TABLE Propuestas (
    IdPropuesta         INT             NOT NULL AUTO_INCREMENT,
    IdPonente           INT             NOT NULL,
    NombreEmpresa       VARCHAR(150)    NULL,
    Tema                VARCHAR(200)    NOT NULL,
    IdeaPrincipal       TEXT            NOT NULL,
    Vision              TEXT            NOT NULL,
    AlcanceEsperado     INT             NOT NULL,
    FechaTentativa      DATE            NOT NULL,
    Estado              ENUM(
                            'pendiente',
                            'aprobada',
                            'rechazada',
                            'cancelada'
                        )               NOT NULL DEFAULT 'pendiente',
    MotivoRechazo       TEXT            NULL,
    FechaEnvio          DATETIME        NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_propuestas
        PRIMARY KEY (IdPropuesta),
    CONSTRAINT fk_propuestas_ponente
        FOREIGN KEY (IdPonente)
        REFERENCES Usuarios(IdUsuario)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT chk_alcance_esperado
        CHECK (AlcanceEsperado > 0)
);

-- ============================================
-- TABLA: DocumentosPropuesta
-- Maximo 3 archivos por propuesta (validado en app)
-- Tipos: pdf, ppt, pptx, doc, docx
-- Tamano maximo: 20 MB por archivo
-- ============================================
CREATE TABLE DocumentosPropuesta (
    IdDocumento         INT             NOT NULL AUTO_INCREMENT,
    IdPropuesta         INT             NOT NULL,
    NombreOriginal      VARCHAR(255)    NOT NULL,
    RutaArchivo         VARCHAR(500)    NOT NULL,
    TipoArchivo         VARCHAR(10)     NOT NULL,
    TamanoBytes         INT             NOT NULL,
    FechaSubida         DATETIME        NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_documentos
        PRIMARY KEY (IdDocumento),
    CONSTRAINT fk_documentos_propuesta
        FOREIGN KEY (IdPropuesta)
        REFERENCES Propuestas(IdPropuesta)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT chk_tipo_archivo
        CHECK (TipoArchivo IN ('pdf', 'ppt', 'pptx', 'doc', 'docx')),
    CONSTRAINT chk_tamano_archivo
        CHECK (TamanoBytes > 0 AND TamanoBytes <= 20971520)
);

-- ============================================
-- TABLA: Eventos
-- ============================================
CREATE TABLE Eventos (
    IdEvento            INT             NOT NULL AUTO_INCREMENT,
    IdPropuesta         INT             NOT NULL,
    IdPonente           INT             NOT NULL,
    FechaDefinitiva     DATE            NOT NULL,
    HoraInicio          TIME            NOT NULL,
    HoraFin             TIME            NOT NULL,
    Lugar               VARCHAR(200)    NOT NULL,
    CupoMaximo          INT             NOT NULL,
    Estado              ENUM(
                            'activo',
                            'cancelado'
                        )               NOT NULL DEFAULT 'activo',
    MotivoCancelacion   TEXT            NULL,
    FechaCreacion       DATETIME        NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_eventos
        PRIMARY KEY (IdEvento),
    CONSTRAINT uq_eventos_propuesta
        UNIQUE (IdPropuesta),
    CONSTRAINT fk_eventos_propuesta
        FOREIGN KEY (IdPropuesta)
        REFERENCES Propuestas(IdPropuesta)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_eventos_ponente
        FOREIGN KEY (IdPonente)
        REFERENCES Usuarios(IdUsuario)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT chk_horas_evento
        CHECK (HoraFin > HoraInicio),
    CONSTRAINT chk_cupo_evento
        CHECK (CupoMaximo > 0)
);

-- ============================================
-- TABLA: Inscripciones
-- ============================================
CREATE TABLE Inscripciones (
    IdInscripcion       INT             NOT NULL AUTO_INCREMENT,
    IdAsistente         INT             NOT NULL,
    IdEvento            INT             NOT NULL,
    FechaInscripcion    DATETIME        NOT NULL DEFAULT NOW(),
    FechaCancelacion    DATETIME        NULL,
    MotivoCancelacion   TEXT            NULL,
    Estado              ENUM(
                            'activa',
                            'cancelada'
                        )               NOT NULL DEFAULT 'activa',
    CONSTRAINT pk_inscripciones
        PRIMARY KEY (IdInscripcion),
    CONSTRAINT uq_inscripciones_asistente_evento
        UNIQUE (IdAsistente, IdEvento),
    CONSTRAINT fk_inscripciones_asistente
        FOREIGN KEY (IdAsistente)
        REFERENCES Usuarios(IdUsuario)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_inscripciones_evento
        FOREIGN KEY (IdEvento)
        REFERENCES Eventos(IdEvento)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- ============================================
-- INDICES
-- ============================================
CREATE INDEX idx_propuestas_ponente
    ON Propuestas(IdPonente);

CREATE INDEX idx_propuestas_estado
    ON Propuestas(Estado);

CREATE INDEX idx_eventos_lugar_fecha
    ON Eventos(Lugar, FechaDefinitiva, Estado);

CREATE INDEX idx_eventos_ponente
    ON Eventos(IdPonente);

CREATE INDEX idx_inscripciones_asistente
    ON Inscripciones(IdAsistente);

CREATE INDEX idx_inscripciones_evento_estado
    ON Inscripciones(IdEvento, Estado);


-- ============================================
-- SEED 1: ADMINISTRADOR POR DEFECTO
-- Correo: admin@pascualbravo.edu.co (construido con CHAR para evitar
--         conversion automatica a markdown en copy/paste)
-- Password: admin123
-- Hash bcrypt verificado con saltRounds 10
-- ============================================
INSERT INTO Usuarios (Nombre, Correo, Contrasena, Rol, EstadoCuenta, Activo)
VALUES (
    'Administrador',
    CONVERT(
        CHAR(97,100,109,105,110,64,112,97,115,99,117,97,108,98,114,97,118,111,46,101,100,117,46,99,111)
        USING utf8mb4
    ),
    '$2b$10$khQi92qV1EQThAHb8ka7B./IFHZoLwNKFVI/S7MOCtHHwPex2ME66',
    'administrador',
    'aprobada',
    1
);

-- ============================================
-- SEED 2: PONENTE APROBADO (para pruebas de login)
-- Correo: ponente@pascualbravo.edu.co
-- Password: ponente123
-- EstadoCuenta: aprobada (puede entrar directamente)
-- ============================================
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

-- ============================================
-- SEED 3: PONENTE PENDIENTE DE APROBACION (para pruebas del flujo)
-- Correo: ponente2@pascualbravo.edu.co
-- Password: ponente2024
-- EstadoCuenta: pendiente (el admin debe aprobarlo desde /admin/solicitudes)
-- ============================================
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


-- ============================================
-- VERIFICACIONES FINALES
-- ============================================

-- Debe mostrar 5 tablas
SELECT COUNT(*) AS total_tablas
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'events_db' AND TABLE_TYPE = 'BASE TABLE';

-- Debe mostrar 3 usuarios (admin, Carlos aprobado, Laura pendiente)
SELECT IdUsuario, Nombre, Correo, LENGTH(Correo) AS largo, Rol, EstadoCuenta, Activo
FROM Usuarios
ORDER BY IdUsuario;

-- Debe listar 6 indices personalizados (9 entradas por el compuesto)
SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'events_db' AND INDEX_NAME LIKE 'idx_%'
ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;


-- ============================================
-- CREDENCIALES DE PRUEBA
-- ============================================
-- Admin:                                                         Password: admin123
-- Carlos Mendoza (ponente, aprobado):                            Password: ponente123
-- Laura Restrepo (ponente, pendiente de aprobacion):             Password: ponente2024
--
-- Recuerda: estas son credenciales de DESARROLLO. En produccion,
-- todas las contrasenas deben cambiarse por valores seguros.
-- ============================================

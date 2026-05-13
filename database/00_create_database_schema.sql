-- ============================================
-- SISTEMA EVENTS - PASCUAL BRAVO
-- Script completo: DROP + CREATE + DATOS INICIALES
-- Motor: MySQL 8+
-- ============================================
-- IMPORTANTE: Abre este archivo directamente en Workbench
--   (File -> Open SQL Script) y ejecuta con el rayo amarillo.
--   NO COPIES Y PEGUES desde el chat.
-- ============================================

-- ============================================
-- LIMPIEZA: Borrar todo lo anterior
-- ============================================
DROP DATABASE IF EXISTS events_db;

-- ============================================
-- CREACION DE LA BASE DE DATOS
-- ============================================
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
-- USUARIO ADMINISTRADOR POR DEFECTO
-- Correo: admin@pascualbravo.edu.co (construido con CHAR para
--   evitar conversion a markdown durante copy/paste)
-- Password: admin123 (cambiar en produccion)
-- Hash bcrypt con saltRounds 10 (verificado con bcryptjs)
-- ============================================
INSERT INTO Usuarios (Nombre, Correo, Contrasena, Rol)
VALUES (
    'Administrador',
    CONVERT(
        CHAR(97,100,109,105,110,64,112,97,115,99,117,97,108,98,114,97,118,111,46,101,100,117,46,99,111)
        USING utf8mb4
    ),
    '$2b$10$khQi92qV1EQThAHb8ka7B./IFHZoLwNKFVI/S7MOCtHHwPex2ME66',
    'administrador'
);

-- ============================================
-- VERIFICACION FINAL
-- ============================================

-- Debe mostrar 5 tablas
SELECT COUNT(*) AS total_tablas
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'events_db' AND TABLE_TYPE = 'BASE TABLE';

-- Debe mostrar el admin con correo de 25 caracteres
SELECT IdUsuario, Nombre, Correo, LENGTH(Correo) AS largo, Rol
FROM Usuarios;

-- Debe listar 8 entradas (6 indices, uno compuesto cuenta como 3)
SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'events_db' AND INDEX_NAME LIKE 'idx_%'
ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;

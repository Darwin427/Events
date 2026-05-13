-- ============================================
-- Migracion 01: Cambios para el modulo del Ponente
-- ============================================
-- Aplica 3 cambios al schema, todos NO destructivos:
--   1. Permite ponentes internos (NombreEmpresa puede ser NULL)
--   2. Agrega EstadoCuenta para distinguir pendientes de aprobacion
--      vs cuentas desactivadas
--   3. Permite cancelacion de propuestas como estado historico
--
-- Uso: File -> Open SQL Script en Workbench y ejecutar.
-- Se puede correr varias veces sin efectos secundarios.
-- ============================================

USE events_db;

-- ============================================
-- CAMBIO 1: NombreEmpresa pasa a ser opcional
-- Razon: ahora aceptamos ponentes internos de la universidad,
--   quienes no representan a una empresa externa.
-- ============================================
ALTER TABLE Propuestas
    MODIFY COLUMN NombreEmpresa VARCHAR(150) NULL;


-- ============================================
-- CAMBIO 2: Agregar EstadoCuenta a Usuarios
-- Razon: distinguir 3 situaciones distintas:
--   - 'pendiente'  -> el usuario solicito cuenta, espera aprobacion del admin
--   - 'aprobada'   -> el admin aprobo la cuenta, el usuario puede entrar
--   - 'rechazada'  -> el admin rechazo la solicitud (en practica eliminamos el registro)
-- El admin y los registros existentes se marcan como 'aprobada' por el default.
-- ============================================
-- NOTA: MySQL no soporta 'ADD COLUMN IF NOT EXISTS' (es de MariaDB).
-- Si la columna ya existe al re-ejecutar el script, MySQL devuelve error
-- 1060 'Duplicate column name'. Es seguro ignorar ese error en re-ejecuciones.
ALTER TABLE Usuarios
    ADD COLUMN EstadoCuenta
    ENUM('pendiente', 'aprobada', 'rechazada')
    NOT NULL DEFAULT 'aprobada'
    AFTER Rol;


-- ============================================
-- CAMBIO 3: Agregar 'cancelada' al ENUM de Propuestas.Estado
-- Razon: cuando el ponente cancela una propuesta pendiente,
--   queremos preservar el historico (soft delete) en vez de borrarla.
--   Tambien usado cuando un ponente queda inactivo y sus propuestas
--   se cancelan automaticamente.
-- ============================================
ALTER TABLE Propuestas
    MODIFY COLUMN Estado
    ENUM('pendiente', 'aprobada', 'rechazada', 'cancelada')
    NOT NULL DEFAULT 'pendiente';


-- ============================================
-- VERIFICACIONES
-- ============================================

-- 1. NombreEmpresa debe ser NULLable
SELECT
    COLUMN_NAME,
    IS_NULLABLE,
    COLUMN_TYPE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'events_db'
  AND TABLE_NAME   = 'Propuestas'
  AND COLUMN_NAME  = 'NombreEmpresa';
-- Esperado: IS_NULLABLE = 'YES'

-- 2. EstadoCuenta debe existir con los 3 valores
SELECT
    COLUMN_NAME,
    COLUMN_TYPE,
    COLUMN_DEFAULT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'events_db'
  AND TABLE_NAME   = 'Usuarios'
  AND COLUMN_NAME  = 'EstadoCuenta';
-- Esperado: enum('pendiente','aprobada','rechazada'), default 'aprobada'

-- 3. Estado de Propuestas debe tener 4 valores (incluyendo 'cancelada')
SELECT
    COLUMN_NAME,
    COLUMN_TYPE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'events_db'
  AND TABLE_NAME   = 'Propuestas'
  AND COLUMN_NAME  = 'Estado';
-- Esperado: enum('pendiente','aprobada','rechazada','cancelada')

-- 4. El admin existente debe tener EstadoCuenta = 'aprobada'
SELECT IdUsuario, Nombre, Correo, Rol, EstadoCuenta, Activo
FROM Usuarios
WHERE Rol = 'administrador';
-- Esperado: EstadoCuenta = 'aprobada'

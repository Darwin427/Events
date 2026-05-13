-- ============================================
-- FIX: Corrección del correo del administrador
-- ============================================
-- Problema: El INSERT inicial guardó el correo en formato markdown
--           '[admin@pascualbravo.edu.co](mailto:admin@pascualbravo.edu.co)'
--           en lugar del correo real.
--
-- Este script corrige ese registro y verifica el resultado.
-- ============================================

USE events_db;

-- Paso 1: Ver el estado actual (antes del fix)
SELECT IdUsuario, Nombre, Correo, Rol
FROM Usuarios
WHERE Rol = 'administrador';

-- Paso 2: Corregir el correo del administrador
UPDATE Usuarios
SET Correo = 'admin@pascualbravo.edu.co'
WHERE Rol = 'administrador'
  AND Correo LIKE '[admin@pascualbravo.edu.co]%';

-- Paso 3: Verificar el resultado (debe mostrar el correo limpio)
SELECT IdUsuario, Nombre, Correo, Rol, FechaRegistro, Activo
FROM Usuarios
WHERE Rol = 'administrador';

-- Resultado esperado:
-- IdUsuario | Nombre         | Correo                       | Rol            | Activo
-- 1         | Administrador  | admin@pascualbravo.edu.co    | administrador  | 1

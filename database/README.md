# Base de datos — Sistema Events

Este directorio contiene todos los scripts SQL del proyecto.

## Archivos

```
database/
├── full_setup.sql                  ← Instalacion completa desde cero
├── 00_create_database_schema.sql   ← Solo schema + admin (sin ponentes)
├── test_database_connection.js     ← Test de conexion (node)
├── migrations/                     ← Cambios incrementales al schema
│   └── 01_modulo_ponente_changes.sql
├── seeds/                          ← Datos de prueba opcionales
│   ├── ponente_prueba.sql          (Carlos, aprobado)
│   └── ponente_pendiente.sql       (Laura, pendiente)
└── archive/                        ← Scripts historicos de fixes
    ├── fix_admin_password_hash.sql
    ├── legacy_database_constraints_validation_tests.sql
    └── legacy_fix_admin_email_markdown.sql
```

## Instalacion rapida (recomendada)

Si quieres montar el proyecto desde cero, **usa solo `full_setup.sql`**.
Recrea todo en un solo paso: base, tablas, indices, 1 admin y 2 ponentes.

```sql
-- En MySQL Workbench: File -> Open SQL Script -> seleccionar full_setup.sql -> Ejecutar
```

O desde linea de comandos:
```bash
mysql -u root -p < database/full_setup.sql
```

## Instalacion paso a paso

Si prefieres entender cada parte, ejecuta en este orden:

1. `00_create_database_schema.sql` — crea la base con todo el schema + admin
2. `seeds/ponente_prueba.sql` — agrega a Carlos (ponente aprobado)
3. `seeds/ponente_pendiente.sql` — agrega a Laura (ponente pendiente)

## Verificar conexion

Despues de instalar la base, verifica que Node se conecte correctamente:

```bash
npm run test:db
```

Debe mostrar la version de MySQL, los conteos por tabla y datos del admin.

## Credenciales de desarrollo

| Rol | Correo | Password | Estado |
|---|---|---|---|
| Administrador | `admin@pascualbravo.edu.co` | `admin123` | Aprobado |
| Ponente | `ponente@pascualbravo.edu.co` | `ponente123` | Aprobado |
| Ponente | `ponente2@pascualbravo.edu.co` | `ponente2024` | Pendiente |

> Para usar las credenciales pendientes, el admin debe aprobarlas en `/admin/solicitudes`.

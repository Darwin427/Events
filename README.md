# Sistema de Gestión de Eventos Universitarios - Node.js

Proyecto migrado de ASP.NET Web Forms a Node.js con Express y EJS, con estructura organizada por roles.

## 🏗️ Estructura del Proyecto

```
├── server.js                           # Servidor principal
├── package.json                        # Dependencias npm
├── package-lock.json                   # Lock de dependencias
├── README.md                          # Documentación
├── src/                                # Código fuente
│   ├── config/                         # Configuraciones
│   │   ├── database.js               # Configuración BD
│   │   └── demoUsers.js              # Usuarios demo
│   ├── controllers/                    # Controladores por rol
│   │   ├── admin/                     # Lógica administrador
│   │   │   └── adminController.js
│   │   ├── asistente/                 # Lógica asistente
│   │   │   └── asistenteController.js
│   │   ├── ponente/                   # Lógica ponente
│   │   │   └── ponenteController.js
│   │   └── shared/                    # Lógica compartida
│   │       └── sharedController.js
│   ├── middleware/                      # Middleware
│   │   └── auth.js                   # Autenticación
│   └── routes/                         # Rutas por rol
│       ├── admin/                     # Rutas admin
│       │   └── adminRoutes.js
│       ├── asistente/                # Rutas asistente
│       │   └── asistenteRoutes.js
│       ├── ponente/                  # Rutas ponente
│       │   └── ponenteRoutes.js
│       └── shared/                   # Rutas compartidas
│           └── sharedRoutes.js
├── views/                             # Plantillas EJS
│   ├── admin/                         # Vistas admin
│   │   ├── login.ejs
│   │   ├── dashboard.ejs
│   │   ├── calendar.ejs
│   │   └── ponencias.ejs
│   ├── asistente/                     # Vistas asistente
│   │   ├── login.ejs
│   │   ├── dashboard.ejs
│   │   ├── calendar.ejs
│   │   └── registro.ejs
│   ├── ponente/                       # Vistas ponente
│   │   ├── login.ejs
│   │   └── dashboard.ejs
│   └── shared/                        # Vistas compartidas
│       ├── inicio.ejs
│       └── error.ejs
├── public/                            # Archivos estáticos
│   └── css/
│       └── Modelo.css                # Estilos CSS
├── uploads/                           # Archivos subidos
└── node_modules/                      # Dependencias npm
```

## 🚀 Características

- **🎯 Organización por Roles**: Cada rol tiene su propia estructura
- **📁 Arquitectura Limpia**: Sin archivos innecesarios del proyecto original
- **🔗 Rutas RESTful**: URLs organizadas y semánticas
- **🧩 Modularidad**: Código fácil de mantener y escalar
- **🔐 Autenticación**: Sistema de login por rol
- **� Modo Demostración**: Funciona sin base de datos

## 🌐 Rutas Disponibles

### Públicas
- `/inicio` - Página principal
- `/admin/login` - Login administrador
- `/asistente/login` - Login asistente
- `/ponente/login` - Login ponente

### Protegidas
- `/admin/dashboard` - Panel administrador
- `/admin/calendar` - Calendario admin
- `/admin/ponencias` - Gestión ponencias
- `/asistente/dashboard` - Panel asistente
- `/asistente/calendar` - Calendario eventos
- `/asistente/registro` - Registro a eventos
- `/ponente/dashboard` - Panel ponente

## 🔑 Credenciales de Demostración

- **👨‍💼 Administrador**: `admin@pascualbravo.edu` / `admin123`
- **👤 Asistente**: `asistente@pascualbravo.edu` / `asistente123`
- **🎤 Ponente**: `ponente@pascualbravo.edu` / `ponente123`

## ⚙️ Instalación y Ejecución

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Iniciar servidor**:
   ```bash
   npm start
   ```

3. **Acceder a la aplicación**:
   ```
   http://localhost:3000
   ```

## 📦 Dependencias Principales

- **express**: Framework web
- **ejs**: Motor de plantillas
- **express-session**: Manejo de sesiones
- **mssql**: Conector SQL Server (para futuro)
- **body-parser**: Procesamiento de formularios

## 🔄 Estado Actual

- ✅ **Migración completa**: ASP.NET → Node.js
- ✅ **Estructura organizada**: Por roles y funcionalidad
- ✅ **Funcionalidad demo**: Sistema operativo sin BD
- ✅ **Limpieza**: Archivos innecesarios eliminados
- ⏳ **Base de datos**: Configurada pero no conectada

## 🎭 Funcionalidades por Rol

### Administrador
- Panel de control principal
- Gestión de calendario
- Aprobación de ponencias

### Asistente
- Visualización de eventos
- Calendario de actividades
- Registro a ponencias

### Ponente
- Envío de propuestas
- Seguimiento de propuestas
- Gestión de documentos

## 🔐 Seguridad

- Autenticación por sesión
- Middleware de protección de rutas
- Verificación de roles
- Manejo seguro de datos

## 🚀 Próximos Pasos

1. Configurar conexión a base de datos SQL Server
2. Implementar CRUD completo para cada entidad
3. Agregar validaciones y manejo de errores
4. Implementar sistema de archivos
5. Agregar pruebas unitarias

El sistema utiliza la misma base de datos SQL Server que el proyecto original (`Event_1`). Las tablas principales son:

- `Usuarios`: Autenticación y roles
- `Eventos`: Información de eventos
- `Ponencias`: Propuestas de ponencias
- `Registros`: Inscripciones a eventos

## Configuración de Base de Datos

En `server.js`, ajusta la configuración según tu entorno:

```javascript
const dbConfig = {
    server: 'TU_SERVER\\SQLEXPRESS',
    database: 'Event_1',
    options: {
        encrypt: true,
        trustServerCertificate: true
    },
    authentication: {
        type: 'ntlm'  // o 'default' para SQL auth
    }
};
```

## Desarrollo

El servidor corre por defecto en `http://localhost:3000`

## Migración desde ASP.NET

Este proyecto mantiene la misma funcionalidad que el sistema original ASP.NET Web Forms pero con tecnología moderna Node.js:

- ASPX → EJS templates
- C# backend → JavaScript/Node.js
- Web.config → package.json y server.js
- SQL Server connection → mssql package
- Session management → express-session
# Eventos
# Eventos

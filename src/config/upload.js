// ============================================
// Configuracion de Multer para subida de archivos
// Documentos de propuestas: max 3 archivos x 20MB,
// tipos permitidos: pdf, ppt, pptx, doc, docx
// ============================================

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOADS_BASE = path.join(__dirname, '..', '..', 'uploads', 'propuestas');
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const ALLOWED_EXTENSIONS = ['.pdf', '.ppt', '.pptx', '.doc', '.docx'];

// Asegurar que la carpeta base existe
if (!fs.existsSync(UPLOADS_BASE)) {
    fs.mkdirSync(UPLOADS_BASE, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const idPropuesta = req.params.id;
        if (!idPropuesta) {
            return cb(new Error('IdPropuesta no especificado en la URL.'));
        }
        const folder = path.join(UPLOADS_BASE, String(idPropuesta));
        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, { recursive: true });
        }
        cb(null, folder);
    },
    filename: function (req, file, cb) {
        // Nombre unico: timestamp + nombre original sanitizado
        const ext = path.extname(file.originalname).toLowerCase();
        const baseName = path.basename(file.originalname, ext)
            .replace(/[^a-zA-Z0-9_-]/g, '_')
            .substring(0, 50);
        const unique = Date.now() + '_' + baseName + ext;
        cb(null, unique);
    }
});

function fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return cb(new Error('Tipo de archivo no permitido. Solo se aceptan: PDF, PPT, PPTX, DOC, DOCX.'));
    }
    cb(null, true);
}

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1 // un archivo por request
    }
});

module.exports = {
    upload,
    UPLOADS_BASE,
    MAX_FILE_SIZE,
    ALLOWED_EXTENSIONS
};

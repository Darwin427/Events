#!/usr/bin/env bash
# ============================================================
# fix-merge.sh
# Rehace el merge entre main y mejoras-darwin de forma correcta:
#   - Archivos de asistente: se quedan los de main
#   - Archivos de admin/ponente/server/css: se traen de mejoras-darwin
#
# Uso (en Git Bash, dentro de C:\Users\dmari\Downloads\Eventos_1):
#   bash fix-merge.sh
# ============================================================

set -e  # detener al primer error

echo ""
echo "=========================================="
echo "  FIX MERGE: main <- mejoras-darwin"
echo "=========================================="
echo ""

# --- 0. Verificaciones previas ----------------------------------------------
RAMA_ACTUAL=$(git rev-parse --abbrev-ref HEAD)
if [ "$RAMA_ACTUAL" != "main" ]; then
    echo "[ERROR] Debes estar en la rama 'main'. Estas en: $RAMA_ACTUAL"
    echo "        Ejecuta: git checkout main"
    exit 1
fi

# Verificar que existan los commits clave
git cat-file -e 478f7d4 2>/dev/null || { echo "[ERROR] No existe commit 478f7d4 (main pre-merge)"; exit 1; }
git cat-file -e f9062ff 2>/dev/null || { echo "[ERROR] No existe commit f9062ff (tip de mejoras-darwin)"; exit 1; }

echo "[OK] En rama main. Commits clave existen."
echo ""

# --- 1. Backups de seguridad -------------------------------------------------
echo "[1/6] Creando ramas de respaldo..."
git branch -f backup-merge-roto-$(date +%Y%m%d-%H%M%S) HEAD
git branch -f backup-main-prebad 478f7d4 2>/dev/null || true
git branch -f backup-mejoras-tip f9062ff 2>/dev/null || true
echo "      Respaldos creados:"
git branch | grep backup
echo ""

# --- 2. Descartar ruido CRLF y resetear a estado pre-merge -------------------
echo "[2/6] Limpiando working tree y reseteando main a 478f7d4..."
git reset --hard 478f7d4
echo "      main ahora apunta a 478f7d4 (estado pre-merge con cambios de asistente)"
echo ""

# --- 3. Iniciar merge correcto ----------------------------------------------
echo "[3/6] Iniciando merge con mejoras-darwin (sin commit aun)..."
# Permitir conflictos sin abortar el script
set +e
git merge mejoras-darwin --no-commit --no-ff
MERGE_EXIT=$?
set -e

if [ $MERGE_EXIT -ne 0 ]; then
    echo "      Hay conflictos (esperado). Procediendo a resolverlos..."
else
    echo "      Merge sin conflictos automaticos. Verificando si necesita ajustes..."
fi
echo ""

# --- 4. Resolver conflictos: asistente -> main, resto -> mejoras-darwin -----
echo "[4/6] Resolviendo conflictos segun el rol del archivo..."

# Archivos de ASISTENTE: nos quedamos con la version de main (--ours)
ASISTENTE_FILES=(
    "src/controllers/asistente/asistenteController.js"
    "src/routes/asistente/asistenteRoutes.js"
    "views/asistente/dashboard.ejs"
    "views/asistente/login.ejs"
    "views/asistente/registro.ejs"
)

for f in "${ASISTENTE_FILES[@]}"; do
    if [ -f "$f" ] || git ls-files --error-unmatch "$f" 2>/dev/null; then
        # Solo aplicar checkout si esta en conflicto o existe en el indice
        if git status --porcelain "$f" | grep -q "^[UAD][UAD]\|^AA\|^DD"; then
            echo "      [main]   $f"
            git checkout --ours -- "$f"
            git add "$f"
        fi
    fi
done

# Para archivos de admin/ponente/server.js/Modelo.css que pudieran tener
# conflicto, nos quedamos con la version de mejoras-darwin (--theirs)
THEIRS_FILES=(
    "server.js"
    "public/css/Modelo.css"
    "src/controllers/admin/adminController.js"
    "src/controllers/ponente/ponenteController.js"
    "src/routes/admin/adminRoutes.js"
    "views/admin/calendar.ejs"
    "views/admin/dashboard.ejs"
    "views/admin/evento-editar.ejs"
    "views/admin/propuesta-revisar.ejs"
    "views/ponente/propuesta-detalle.ejs"
    "database/seeds/asistente_prueba.sql"
)

for f in "${THEIRS_FILES[@]}"; do
    if git status --porcelain "$f" 2>/dev/null | grep -q "^[UAD][UAD]\|^AA\|^DD"; then
        echo "      [mejoras] $f"
        git checkout --theirs -- "$f"
        git add "$f"
    fi
done

echo ""

# --- 5. Verificar que no queden conflictos ----------------------------------
echo "[5/6] Verificando que no queden conflictos sin resolver..."
CONFLICTOS=$(git diff --name-only --diff-filter=U)
if [ -n "$CONFLICTOS" ]; then
    echo "[WARN] Quedan estos conflictos sin resolver:"
    echo "$CONFLICTOS"
    echo ""
    echo "Resuelvelos manualmente y luego ejecuta:"
    echo "  git add <archivo>"
    echo "  git commit -m 'merge: asistente desde main, admin/ponente desde mejoras-darwin'"
    exit 1
fi
echo "      Sin conflictos pendientes."
echo ""

# --- 6. Commit del merge -----------------------------------------------------
echo "[6/6] Creando commit de merge..."
git commit -m "merge mejoras-darwin: asistente desde main, admin/ponente desde mejoras-darwin

- asistenteController.js, asistenteRoutes.js: version de main
- views/asistente/dashboard, login, registro: version de main
- views/asistente/calendar, eventos, partials/asistente-header: solo en main (auto-merge)
- adminController, adminRoutes, views/admin/*: version de mejoras-darwin
- ponenteController, views/ponente/propuesta-detalle: version de mejoras-darwin
- server.js, public/css/Modelo.css, database/seeds/asistente_prueba.sql: de mejoras-darwin"

echo ""
echo "=========================================="
echo "  MERGE COMPLETADO"
echo "=========================================="
echo ""
echo "Historia resultante:"
git log --oneline --graph -8
echo ""
echo "Siguiente paso (cuando hayas verificado que la app funciona):"
echo "  git push origin main"
echo ""
echo "Si algo salio mal, puedes recuperar el estado anterior con:"
echo "  git reset --hard backup-merge-roto-<fecha>"

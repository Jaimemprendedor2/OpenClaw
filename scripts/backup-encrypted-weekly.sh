#!/bin/bash

# backup-encrypted-weekly.sh
# Backup encriptado semanal de ~/.openclaw

set -e

# Configuración
BACKUP_DIR="$HOME/backups-encrypted"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="openclaw-backup-$TIMESTAMP"
BACKUP_FILE="$BACKUP_DIR/$BACKUP_NAME.tar.gz.gpg"
GPG_PASSPHRASE="${GPG_PASSPHRASE:-}" # Setear en crontab o .env
OPENCLAW_DIR="$HOME/.openclaw"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Backup Encriptado Semanal de OpenClaw ===${NC}"
echo "Fecha: $(date)"
echo "Backup: $BACKUP_NAME"
echo "Directorio: $OPENCLAW_DIR"
echo ""

# Verificar passphrase
if [ -z "$GPG_PASSPHRASE" ]; then
    echo -e "${RED}❌ Error: GPG_PASSPHRASE no configurada${NC}"
    echo "Configurar en crontab o variable de entorno:"
    echo "  export GPG_PASSPHRASE='tu_passphrase'"
    exit 1
fi

# Crear directorio de backups si no existe
mkdir -p "$BACKUP_DIR"

# Paso 1: Crear tar.gz de ~/.openclaw (excluyendo cache y temporales)
echo -e "${YELLOW}[1/3] Creando archivo tar.gz...${NC}"
tar -czf - \
    --exclude="*.log" \
    --exclude="*.tmp" \
    --exclude="cache/*" \
    --exclude="node_modules/*" \
    --exclude="workspace/.git/*" \
    -C "$HOME" .openclaw 2>/dev/null | \
    gpg --batch --yes --passphrase "$GPG_PASSPHRASE" \
        --symmetric --cipher-algo AES256 \
        -o "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backup encriptado creado${NC}"
    echo "  Archivo: $BACKUP_FILE"
    echo "  Tamaño: $(du -h "$BACKUP_FILE" | cut -f1)"
else
    echo -e "${RED}❌ Error creando backup encriptado${NC}"
    exit 1
fi

# Paso 2: Crear checksum
echo -e "${YELLOW}[2/3] Generando checksum...${NC}"
sha256sum "$BACKUP_FILE" > "$BACKUP_FILE.sha256"
echo -e "${GREEN}✅ Checksum generado${NC}"

# Paso 3: Crear metadatos
echo -e "${YELLOW}[3/3] Generando metadatos...${NC}"
cat > "$BACKUP_FILE.meta" << EOF
OpenClaw Backup Encriptado
==========================
Fecha: $(date)
Timestamp: $TIMESTAMP
Usuario: $(whoami)
Hostname: $(hostname)
OpenClaw Version: $(openclaw --version 2>/dev/null || echo "Desconocido")

Contenido:
- ~/.openclaw/ completo (excluyendo cache y logs)
- Configuración, credenciales, workspace
- Sessions, flows, agents

Encriptación:
- Algoritmo: AES256
- Método: GPG symmetric
- Passphrase: Configurada en variable de entorno

Verificación:
  sha256sum -c $BACKUP_NAME.tar.gz.gpg.sha256

Desencriptar:
  gpg --batch --passphrase "\$GPG_PASSPHRASE" --decrypt $BACKUP_NAME.tar.gz.gpg | tar -xzf -

Restaurar:
  gpg --batch --passphrase "\$GPG_PASSPHRASE" --decrypt $BACKUP_NAME.tar.gz.gpg | tar -xzf - -C ~/

Nota: Mantener passphrase segura. Sin ella, el backup es irrecuperable.
EOF

echo -e "${GREEN}✅ Metadatos generados${NC}"

# Opcional: Push a GitHub (si se configura)
if [ -d "$OPENCLAW_DIR/workspace/.git" ] && [ -n "$(git -C "$OPENCLAW_DIR/workspace" remote -v)" ]; then
    echo -e "${YELLOW}Opción: Push a GitHub...${NC}"
    cd "$OPENCLAW_DIR/workspace"
    git add ../backups-encrypted/$BACKUP_NAME.* 2>/dev/null || true
    git commit -m "Backup encriptado semanal: $TIMESTAMP" >/dev/null 2>&1 || true
    git push >/dev/null 2>&1 || echo "  Nota: Push falló o no hay cambios"
fi

# Limpiar backups antiguos (mantener últimos 4 semanas)
echo -e "${YELLOW}Limpiando backups antiguos...${NC}"
find "$BACKUP_DIR" -name "openclaw-backup-*.tar.gz.gpg" -mtime +28 -delete
find "$BACKUP_DIR" -name "openclaw-backup-*.sha256" -mtime +28 -delete
find "$BACKUP_DIR" -name "openclaw-backup-*.meta" -mtime +28 -delete

# Resumen
echo ""
echo -e "${GREEN}✅ Backup semanal completado${NC}"
echo "Archivos creados:"
ls -lh "$BACKUP_DIR/$BACKUP_NAME".*
echo ""
echo -e "${YELLOW}📋 Instrucciones importantes:${NC}"
echo "1. Guardar passphrase en lugar seguro (1Password, etc.)"
echo "2. Probar restauración periódicamente"
echo "3. Backup offsite recomendado (cloud storage)"
echo ""
echo "Para restaurar:"
echo "  export GPG_PASSPHRASE='tu_passphrase'"
echo "  gpg --batch --passphrase \"\$GPG_PASSPHRASE\" --decrypt $BACKUP_FILE | tar -xzf - -C ~/"

exit 0
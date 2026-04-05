#!/bin/bash

# backup-agent.sh
# Script de backup completo del agente Donna

set -e

# Configuración
BACKUP_DIR="../backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="donna-agent-backup-$TIMESTAMP"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Backup del Agente Donna 🦞 ===${NC}"
echo "Fecha: $(date)"
echo "Backup: $BACKUP_NAME"
echo ""

# Crear directorio de backups si no existe
mkdir -p "$BACKUP_DIR"

# Paso 1: Backup de archivos core
echo -e "${YELLOW}[1/5] Respaldando archivos core...${NC}"
tar -czf "$BACKUP_PATH-core.tar.gz" \
  SOUL.md \
  IDENTITY.md \
  AGENTS.md \
  USER.md \
  SECURITY.md \
  TOOLS.md \
  HEARTBEAT.md \
  README.md \
  .gitignore

# Paso 2: Backup de memoria
echo -e "${YELLOW}[2/5] Respaldando memoria...${NC}"
tar -czf "$BACKUP_PATH-memory.tar.gz" memory/

# Paso 3: Backup de documentación
echo -e "${YELLOW}[3/5] Respaldando documentación...${NC}"
tar -czf "$BACKUP_PATH-docs.tar.gz" docs/

# Paso 4: Backup de configuración
echo -e "${YELLOW}[4/5] Respaldando configuración...${NC}"
tar -czf "$BACKUP_PATH-config.tar.gz" config/

# Paso 5: Backup de skills
echo -e "${YELLOW}[5/5] Respaldando skills...${NC}"
tar -czf "$BACKUP_PATH-skills.tar.gz" skills/

# Crear archivo de checksums
echo -e "${YELLOW}Generando checksums...${NC}"
cd "$BACKUP_DIR"
sha256sum $BACKUP_NAME-*.tar.gz > $BACKUP_NAME.sha256

# Crear archivo de metadatos
cat > $BACKUP_NAME.meta << EOF
Backup del Agente Donna
=======================
Fecha: $(date)
Timestamp: $TIMESTAMP
Agente: Donna 🦞
Usuario: Jaime (Jaimemprendedor)
OpenClaw: $(openclaw --version 2>/dev/null || echo "Desconocido")

Archivos incluidos:
- Core identity (SOUL.md, IDENTITY.md, etc.)
- Memoria completa (memory/)
- Documentación (docs/)
- Configuración (config/)
- Skills instaladas (skills/)

Tamaños:
$(ls -lh $BACKUP_NAME-*.tar.gz | awk '{print $5, $9}')

Instrucciones de restauración:
1. Extraer todos los archivos .tar.gz
2. Verificar checksums: sha256sum -c $BACKUP_NAME.sha256
3. Reemplazar archivos en workspace
4. Restaurar credenciales manualmente (no incluidas)

Nota: Credenciales y secrets NO están incluidos por seguridad.
EOF

# Paso final: Git commit y push
echo -e "${YELLOW}Haciendo commit y push a GitHub...${NC}"
cd ..
git add backups/$BACKUP_NAME.*
git commit -m "Backup automático del agente: $BACKUP_NAME" > /dev/null 2>&1 || echo "No hay cambios para commit"
git push > /dev/null 2>&1 || echo "Push falló o no hay cambios"

# Resumen
echo ""
echo -e "${GREEN}✅ Backup completado${NC}"
echo "Archivos creados:"
ls -lh $BACKUP_DIR/$BACKUP_NAME.*
echo ""
echo "Checksum verification:"
echo "  cd $BACKUP_DIR && sha256sum -c $BACKUP_NAME.sha256"
echo ""
echo -e "${YELLOW}⚠️  Recordatorio:${NC}"
echo "  - Credenciales NO están incluidas en el backup"
echo "  - Restaurar manualmente desde 1Password o similar"
echo "  - Revisar config/backup-list.md para lista completa"

# Limpiar backups antiguos (mantener últimos 7 días)
find "$BACKUP_DIR" -name "donna-agent-backup-*.tar.gz" -mtime +7 -delete
find "$BACKUP_DIR" -name "donna-agent-backup-*.sha256" -mtime +7 -delete
find "$BACKUP_DIR" -name "donna-agent-backup-*.meta" -mtime +7 -delete

exit 0
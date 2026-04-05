#!/bin/bash
# ============================================================
# integrity-check.sh — OpenClaw Intrusion Detection
# Corre cada hora via crontab.
#
# LÓGICA DE DOS NIVELES:
#   NIVEL 1 — Archivos NUNCA deben cambiar (alerta real si cambian)
#   NIVEL 2 — Archivos de workspace (se regeneran solos vía git hook)
# ============================================================

WORKSPACE="/home/ubuntu/.openclaw/workspace"
OPENCLAW_DIR="/home/ubuntu/.openclaw"
CHECKSUMS_STATIC="$WORKSPACE/config/checksums-static.sha256"
CHECKSUMS_WORKSPACE="$WORKSPACE/config/checksums-workspace.sha256"
AUDIT_LOG="$WORKSPACE/logs/audit.log"
ALERT_LOG="$WORKSPACE/logs/alerts.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# ── NIVEL 1: Estos archivos NUNCA deberían cambiar sin tu intervención
# Si cambian = posible intrusión real
STATIC_FILES=(
    "$OPENCLAW_DIR/openclaw.json"
    "$OPENCLAW_DIR/.env.gpg"
    "$HOME/.ssh/authorized_keys"
)

# ── NIVEL 2: Archivos que Donna modifica legítimamente
# El baseline se regenera automáticamente en cada git commit
WORKSPACE_FILES=(
    "$WORKSPACE/SOUL.md"
    "$WORKSPACE/AGENTS.md"
    "$WORKSPACE/IDENTITY.md"
    "$WORKSPACE/docs/USER.md"
    "$WORKSPACE/memory/MEMORY.md"
    "$WORKSPACE/context/CLAUDE.md"
)

mkdir -p "$WORKSPACE/logs"

log() { echo "[$TIMESTAMP] $1" >> "$AUDIT_LOG"; }
alert() {
    echo "[$TIMESTAMP] ⚠️  ALERTA: $1" | tee -a "$ALERT_LOG" "$AUDIT_LOG" > /dev/null
}

log "=== Iniciando verificación de integridad ==="

# ── Función para verificar checksums ────────────────────────
check_files() {
    local CHECKSUM_FILE="$1"
    local LEVEL="$2"
    local FILES=("${@:3}")
    local CHANGED=0

    if [ ! -f "$CHECKSUM_FILE" ]; then
        log "Creando baseline $LEVEL..."
        for f in "${FILES[@]}"; do
            [ -f "$f" ] && sha256sum "$f" >> "$CHECKSUM_FILE" && log "  Baseline: $f"
        done
        log "Baseline $LEVEL creado."
        return 0
    fi

    while IFS= read -r line; do
        EXPECTED=$(echo "$line" | awk '{print $1}')
        FILE=$(echo "$line" | awk '{print $2}')
        [ ! -f "$FILE" ] && alert "[$LEVEL] Archivo ELIMINADO: $FILE" && CHANGED=1 && continue
        CURRENT=$(sha256sum "$FILE" | awk '{print $1}')
        if [ "$CURRENT" != "$EXPECTED" ]; then
            if [ "$LEVEL" = "CRÍTICO" ]; then
                alert "[$LEVEL] Archivo MODIFICADO sin autorización: $FILE"
            else
                log "[$LEVEL] Cambio detectado (legítimo via git): $FILE"
            fi
            CHANGED=1
        fi
    done < "$CHECKSUM_FILE"

    [ "$CHANGED" -eq 0 ] && log "[$LEVEL] OK — sin cambios"
}

# ── Verificar archivos estáticos (alertas reales) ───────────
check_files "$CHECKSUMS_STATIC" "CRÍTICO" "${STATIC_FILES[@]}"

# ── Verificar workspace (solo log, no alerta) ────────────────
check_files "$CHECKSUMS_WORKSPACE" "WORKSPACE" "${WORKSPACE_FILES[@]}"

# ── Revisar logins SSH recientes (últimos 60 min) ───────────
FAILED=$(grep "Failed password\|Invalid user" /var/log/auth.log 2>/dev/null | \
    awk -v d="$(date -d '1 hour ago' '+%b %e %H:%M')" '$0 > d' 2>/dev/null | wc -l)
ACCEPTED=$(grep "Accepted" /var/log/auth.log 2>/dev/null | \
    awk -v d="$(date -d '1 hour ago' '+%b %e %H:%M')" '$0 > d' 2>/dev/null | wc -l)

[ "$FAILED" -gt 0 ] && log "SSH fallidos última hora: $FAILED"
[ "$ACCEPTED" -gt 0 ] && log "SSH exitosos última hora: $ACCEPTED"
[ "$FAILED" -gt 5 ] && alert "Posible fuerza bruta SSH: $FAILED intentos fallidos en 1 hora"

# ── Sesiones activas ─────────────────────────────────────────
ACTIVE=$(who | wc -l)
log "Sesiones activas: $ACTIVE"
[ "$ACTIVE" -gt 1 ] && alert "Múltiples sesiones activas: $(who | awk '{print $1, $5}' | tr '\n' ' | ')"

# ── Permisos authorized_keys ─────────────────────────────────
if [ -f "$HOME/.ssh/authorized_keys" ]; then
    PERMS=$(stat -c "%a" "$HOME/.ssh/authorized_keys")
    [ "$PERMS" != "600" ] && alert "Permisos incorrectos en authorized_keys: $PERMS (esperado 600)"
fi

log "=== Verificación completada ==="
echo "✅ Verificación completada — $(date '+%H:%M:%S')"

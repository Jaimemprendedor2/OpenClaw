#!/bin/bash
# ============================================================
# integrity-check.sh — OpenClaw Intrusion Detection
# Corre cada hora via crontab. Detecta cambios en archivos
# críticos y alerta si algo fue modificado sin autorización.
# ============================================================

WORKSPACE="/home/ubuntu/.openclaw/workspace"
OPENCLAW_DIR="/home/ubuntu/.openclaw"
CHECKSUMS_FILE="$WORKSPACE/config/checksums.sha256"
AUDIT_LOG="$WORKSPACE/logs/audit.log"
ALERT_LOG="$WORKSPACE/logs/alerts.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Archivos críticos a monitorear
CRITICAL_FILES=(
    "$OPENCLAW_DIR/openclaw.json"
    "$OPENCLAW_DIR/.env.gpg"
    "$WORKSPACE/SOUL.md"
    "$WORKSPACE/AGENTS.md"
    "$WORKSPACE/IDENTITY.md"
    "$HOME/.ssh/authorized_keys"
)

mkdir -p "$WORKSPACE/logs"

log() {
    echo "[$TIMESTAMP] $1" >> "$AUDIT_LOG"
}

alert() {
    echo "[$TIMESTAMP] ⚠️  ALERTA: $1" >> "$ALERT_LOG"
    echo "[$TIMESTAMP] ⚠️  ALERTA: $1" >> "$AUDIT_LOG"
    # Enviar a Telegram via openclaw si está disponible
    if command -v openclaw &>/dev/null; then
        openclaw message send "🚨 *Alerta de Seguridad OpenClaw*\n\n⚠️ $1\n\n_$(date '+%Y-%m-%d %H:%M:%S')_" 2>/dev/null || true
    fi
}

log "=== Iniciando verificación de integridad ==="

# ── 1. Verificar checksums de archivos críticos ──────────────
if [ ! -f "$CHECKSUMS_FILE" ]; then
    log "Baseline no existe. Creando checksums iniciales..."
    touch "$CHECKSUMS_FILE"
    for f in "${CRITICAL_FILES[@]}"; do
        if [ -f "$f" ]; then
            sha256sum "$f" >> "$CHECKSUMS_FILE"
            log "  Baseline creado: $f"
        fi
    done
    log "Baseline de checksums creado en $CHECKSUMS_FILE"
else
    # Comparar contra baseline
    CHANGED=0
    while IFS= read -r line; do
        EXPECTED_HASH=$(echo "$line" | awk '{print $1}')
        FILE_PATH=$(echo "$line" | awk '{print $2}')

        if [ ! -f "$FILE_PATH" ]; then
            alert "Archivo crítico ELIMINADO: $FILE_PATH"
            CHANGED=1
            continue
        fi

        CURRENT_HASH=$(sha256sum "$FILE_PATH" | awk '{print $1}')
        if [ "$CURRENT_HASH" != "$EXPECTED_HASH" ]; then
            alert "Archivo crítico MODIFICADO: $FILE_PATH"
            CHANGED=1
        fi
    done < "$CHECKSUMS_FILE"

    if [ "$CHANGED" -eq 0 ]; then
        log "Integridad OK — todos los archivos críticos sin cambios"
    fi
fi

# ── 2. Revisar logins SSH recientes (últimos 60 min) ─────────
RECENT_LOGINS=$(grep "Accepted\|Failed\|Invalid" /var/log/auth.log 2>/dev/null | \
    awk -v d="$(date -d '1 hour ago' '+%b %e %H:%M')" '$0 > d' 2>/dev/null | wc -l)

if [ "$RECENT_LOGINS" -gt 0 ]; then
    FAILED=$(grep "Failed password\|Invalid user" /var/log/auth.log 2>/dev/null | \
        awk -v d="$(date -d '1 hour ago' '+%b %e %H:%M')" '$0 > d' 2>/dev/null | wc -l)
    ACCEPTED=$(grep "Accepted" /var/log/auth.log 2>/dev/null | \
        awk -v d="$(date -d '1 hour ago' '+%b %e %H:%M')" '$0 > d' 2>/dev/null | wc -l)

    log "Actividad SSH última hora: $ACCEPTED exitosos, $FAILED fallidos"

    if [ "$FAILED" -gt 5 ]; then
        alert "Posible ataque de fuerza bruta SSH: $FAILED intentos fallidos en la última hora"
    fi
    if [ "$ACCEPTED" -gt 0 ]; then
        USERS=$(grep "Accepted" /var/log/auth.log 2>/dev/null | \
            awk -v d="$(date -d '1 hour ago' '+%b %e %H:%M')" '$0 > d' 2>/dev/null | \
            awk '{print $9}' | sort -u | tr '\n' ', ')
        log "Logins SSH exitosos: usuarios [$USERS]"
    fi
fi

# ── 3. Revisar intentos de sudo recientes ────────────────────
SUDO_EVENTS=$(grep "sudo" /var/log/auth.log 2>/dev/null | \
    awk -v d="$(date -d '1 hour ago' '+%b %e %H:%M')" '$0 > d' 2>/dev/null | wc -l)

if [ "$SUDO_EVENTS" -gt 0 ]; then
    log "Eventos sudo última hora: $SUDO_EVENTS"
fi

# ── 4. Revisar sesiones activas ──────────────────────────────
ACTIVE_SESSIONS=$(who | wc -l)
log "Sesiones activas ahora: $ACTIVE_SESSIONS"
if [ "$ACTIVE_SESSIONS" -gt 1 ]; then
    USERS_ONLINE=$(who | awk '{print $1, $5}' | tr '\n' ' | ')
    alert "Múltiples sesiones activas: $USERS_ONLINE"
fi

# ── 5. Verificar permisos de archivos sensibles ──────────────
if [ -f "$HOME/.ssh/authorized_keys" ]; then
    PERMS=$(stat -c "%a" "$HOME/.ssh/authorized_keys")
    if [ "$PERMS" != "600" ] && [ "$PERMS" != "644" ]; then
        alert "Permisos incorrectos en authorized_keys: $PERMS (esperado 600)"
    fi
fi

log "=== Verificación completada ==="
echo "✅ Verificación completada — ver $AUDIT_LOG"

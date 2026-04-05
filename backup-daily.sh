#!/bin/bash
BACKUP_DIR="$HOME/.openclaw/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
tar -czf "$BACKUP_DIR/openclaw_$TIMESTAMP.tar.gz" \
  "$HOME/.openclaw/openclaw.json" \
  "$HOME/.openclaw/sessions" \
  "$HOME/.openclaw/logs" \
  2>/dev/null || true
find "$BACKUP_DIR" -name "openclaw_*.tar.gz" -mtime +14 -delete
echo "[$(date)] Backup: $TIMESTAMP" >> "$HOME/.openclaw/logs/backups.log"

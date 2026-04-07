# Detección de Intrusiones — OpenClaw

_Implementado: 2026-04-05_

---

## Qué está monitoreando

| Qué | Cómo | Dónde se registra |
|-----|------|-------------------|
| Archivos críticos OpenClaw | Checksums SHA-256 cada hora | `logs/audit.log` |
| Logins SSH exitosos y fallidos | auditd + auth.log | `/var/log/auth.log` |
| Intentos de sudo | auditd | `/var/log/audit/audit.log` |
| Cambios de permisos en `.openclaw/` | auditd | `/var/log/audit/audit.log` |
| Sesiones activas simultáneas | `who` cada hora | `logs/audit.log` |
| Claves SSH (`authorized_keys`) | checksums + permisos | `logs/audit.log` |
| Fuerza bruta SSH | >5 fallidos/hora | `logs/alerts.log` |

---

## Archivos del sistema

```
scripts/integrity-check.sh    — script principal (corre cada hora)
config/checksums.sha256        — baseline de hashes (NO modificar)
logs/audit.log                 — log completo de actividad
logs/alerts.log                — solo alertas (cambios detectados)
/etc/audit/rules.d/openclaw.rules — reglas de auditd
```

---

## Ver logs de intrusión

### Ver alertas recientes
```bash
cat ~/.openclaw/workspace/logs/alerts.log
```

### Ver actividad de la última hora
```bash
tail -50 ~/.openclaw/workspace/logs/audit.log
```

### Ver intentos de login SSH hoy
```bash
grep "$(date '+%b %e')" /var/log/auth.log | grep -E "Accepted|Failed|Invalid"
```

### Ver eventos auditd por archivo crítico
```bash
# Quién tocó openclaw.json
sudo ausearch -k openclaw_config --start today

# Quién tocó .env.gpg
sudo ausearch -k openclaw_secrets --start today

# Quién intentó usar sudo
sudo ausearch -k sudo_exec --start today

# Cambios en permisos de archivos
sudo ausearch -k openclaw_perms --start today
```

---

## Verificar quién accedió

### Logins SSH exitosos (histórico)
```bash
last -n 20
```

### Quién está conectado ahora
```bash
who
w
```

### Últimas conexiones por usuario
```bash
lastlog | grep -v "Never"
```

### IPs que intentaron conectarse (fallidos)
```bash
grep "Failed password" /var/log/auth.log | awk '{print $11}' | sort | uniq -c | sort -rn | head -20
```

### Correr verificación manual ahora
```bash
bash ~/.openclaw/workspace/scripts/integrity-check.sh
```

---

## Si detecta algo sospechoso

### Paso 1 — Confirmar que no fuiste tú
```bash
# Ver qué cambió y cuándo
sudo ausearch -k openclaw_config --start today -i
last -n 10
```

### Paso 2 — Si hay sesión activa no autorizada
```bash
# Ver quién está conectado
who
# Desconectar sesión (reemplazar PTS por el número del who)
sudo pkill -9 -t pts/1
```

### Paso 3 — Bloquear acceso SSH inmediatamente
```bash
sudo systemctl stop ssh
```

### Paso 4 — Revisar qué se modificó
```bash
# Archivos modificados en las últimas 2 horas
find ~/.openclaw -newer ~/.openclaw/workspace/logs/audit.log -type f 2>/dev/null
```

### Paso 5 — Regenerar baseline si los cambios fueron legítimos
```bash
rm ~/.openclaw/workspace/config/checksums.sha256
bash ~/.openclaw/workspace/scripts/integrity-check.sh
```

---

## Actualizar baseline (cuando TÚ modificas archivos a propósito)

Cuando actualices SOUL.md, AGENTS.md u otros archivos monitoreados, regenera el baseline:
```bash
rm ~/.openclaw/workspace/config/checksums.sha256
bash ~/.openclaw/workspace/scripts/integrity-check.sh
```

---

## Estado del sistema

```bash
# Estado de auditd
sudo systemctl status auditd

# Reglas activas
sudo auditctl -l

# Ver si el crontab está corriendo
crontab -l | grep integrity
```

---

_Sistema implementado por Donna 🌹 — 2026-04-05_

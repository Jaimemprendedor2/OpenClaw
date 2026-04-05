# Infraestructura — OpenClaw de Jaime

_Actualizado: 2026-04-05 · Auditado por Donna 🦞_

---

| Componente | Detalle |
|------------|---------|
| **OpenClaw** | v2026.4.2 (d74a122) |
| **Gateway** | `127.0.0.1:18789` (loopback) · Systemd · user service |
| **Node.js** | v24.14.1 |
| **npm** | 11.11.0 |
| **Sistema operativo** | Ubuntu 24.04.4 LTS |
| **Arquitectura** | aarch64 (ARM Neoverse-N1) |
| **CPU** | 1 core (Neoverse-N1) |
| **RAM** | 5.8 GB |
| **Almacenamiento** | 50 GB (estimado, Oracle Cloud) |
| **Servidor** | Oracle Cloud VM · Free Tier |
| **IP Pública** | 165.1.127.183 |
| **Gateway bind** | `127.0.0.1` (loopback) |
| **Costo mensual** | USD 0 (Always Free Tier) |
| **Ubicación** | Oracle Cloud región (No US) |
| **Usuario** | `ubuntu` |

---

## Configuración IA y Modelos

| Componente | Detalle |
|------------|---------|
| **Modelo primario (default)** | `deepseek/deepseek-chat` |
| **Modelo de sesión actual** | `deepseek/deepseek-reasoner` |
| **Fallback models** | `anthropic/claude-sonnet-4-6` (Claude Sonnet) |
| **Modelo imagen** | No configurado |
| **Provider** | OpenRouter (por defecto) |
| **Costo aproximado por consulta** | ~USD 0.0005 (DeepSeek) |
| **Contexto máximo** | 128k tokens (DeepSeek) |
| **Razonamiento (Reasoning)** | OFF por defecto · puede activarse con `/reasoning` |

---

## Canales y Conectividad

| Canal | Estado | Detalle |
|-------|--------|---------|
| **Telegram** | ✅ Activo | `@openclaw_jaime_bot` · canal principal |
| **SSH** | ✅ Activo | puerto 22 (UFW permitido) |
| **Gateway OpenClaw** | ✅ Activo | `127.0.0.1:18789` (solo loopback) |
| **Conexión externa** | 🔒 Loopback-only | No expuesto públicamente |
| **Web dashboard** | ✅ Local | `http://127.0.0.1:18789/` (solo local) |

---

## Seguridad

| Capa | Estado | Detalle |
|------|--------|---------|
| **Firewall (UFW)** | ✅ Activo | solo SSH (22/tcp) permitido |
| **Fail2Ban** | ✅ Activo | jail: `sshd` |
| **Auto-updates** | ✅ Activo | `unattended-upgrades` |
| **Encriptación GPG** | ✅ Configurado | `.env.gpg` (variables de entorno) |
| **Detección de intrusiones** | ✅ Activo | `auditd` + checksums + alertas |
| **SSH keys only** | ✅ Sí | `PasswordAuthentication no` · solo llaves SSH |
| **Gateway external** | 🔒 Loopback | no expuesto a internet |
| **Cron jobs** | 🔒 User-only | ejecución como usuario `ubuntu` |

**Nota de seguridad crítica:** Gateway configurado como `loopback` (127.0.0.1) → solo clientes locales pueden conectar. No hay exposición pública de OpenClaw.

---

## Automatizaciones y Cron

| Tarea | Frecuencia | Script | Estado |
|-------|------------|--------|--------|
| **Backup encriptado semanal** | Dom 02:00 | `backup-encrypted-weekly.sh` | ✅ Activo |
| **Detección de intrusiones** | Cada hora | `integrity-check.sh` | ✅ Activo |
| **Health check** | ✅ Cada 5 minutos | `health-check.sh` | Log: `logs/health-check.log` |
| **Backup diario** | ✅ 03:00 AM diario | `backup-daily.sh` | Retención: 14 días |
| **Backup encriptado semanal** | ✅ Dom 02:00 | `backup-encrypted-weekly.sh` | Log: `~/backup-weekly.log` |
| **Detección de intrusiones** | ✅ Cada hora | `integrity-check.sh` | Log: `logs/audit.log` |
| **Commit automático Git** | Manual | Donna ejecuta commits | ✅ Manual por Donna |

**Scripts en `workspace/scripts/`:**
- `backup-agent.sh` · `backup-daily.sh` · `backup-encrypted-weekly.sh`
- `health-check.sh` · `integrity-check.sh`

---

## Monitoreo y Logs

| Recurso | Ubicación | Retención |
|---------|-----------|-----------|
| **Logs de OpenClaw** | `/tmp/openclaw/openclaw-YYYY-MM-DD.log` | Diario |
| **Logs de auditoría** | `workspace/logs/audit.log` | Ilimitado |
| **Alertas de seguridad** | `workspace/logs/alerts.log` | Ilimitado |
| **Logs de sistema** | `/var/log/syslog`, `/var/log/auth.log` | Rotación estándar |
| **Logs de backup** | `~/backup-weekly.log` | Semanal |

---

## Estructura del Workspace

```
~/.openclaw/workspace/
├── config/              # Configuraciones y checksums de seguridad
├── docs/                # Documentación (este archivo está aquí)
├── memory/              # Memoria del agente (MEMORY.md, negocios/)
├── scripts/             # Scripts de automatización
├── skills/              # Skills instaladas (gog, etc.)
├── context/             # Contexto para Claude (CLAUDE.md)
├── logs/                # Logs de auditoría y alertas
├── SOUL.md              # Personalidad de Donna 🦞
├── AGENTS.md            # Reglas operativas
├── IDENTITY.md          # Identidad (Donna)
└── .git/                # Repositorio Git (GitHub)
```

**Repositorio Git:** `https://github.com/Jaimemprendedor2/OpenClaw.git`
**Último push:** 2026-04-05 (revisar con `git log -1`)

---

## Alertas de Seguridad Activas

El sistema detecta y alerta sobre:

1. **Modificación de archivos críticos** (`openclaw.json`, `.env.gpg`, `authorized_keys`)
2. **Intentos de fuerza bruta SSH** (>5 fallidos/hora)
3. **Múltiples sesiones activas** simultáneas
4. **Cambios de permisos** en archivos críticos
5. **Eventos de sudo** no autorizados

**Ver alertas:** `cat workspace/logs/alerts.log`

---

## Puntos de Mejora Identificados

1. **✅ SSH password deshabilitado** — `PasswordAuthentication no` · solo llaves SSH permitidas
2. **⚠️ Sin monitoreo de recursos** (CPU, RAM, disco) — no alerta por uso alto
3. **✅ Gateway seguro** — loopback-only es buena práctica
4. **✅ Health check activo** — cada 5 minutos
5. **✅ Backups activos** — diario + semanal encriptado

---

## Comandos de Verificación Rápida

```bash
# Estado del sistema
openclaw status
openclaw gateway status

# Seguridad
sudo ufw status
sudo fail2ban-client status
sudo systemctl is-active auditd

# Recursos
free -h
df -h /
nproc

# Logs recientes
tail -20 workspace/logs/audit.log
tail -20 workspace/logs/alerts.log

# Últimos logins
last -n 10
```

---

_Última auditoría completa: 2026-04-05 · Por Donna 🦞_

# Archivos de Configuración a Respaldar

_Lista de archivos que hacen único a este agente y deben respaldarse._

---

## 🏆 **Archivos Core (Críticos)**

### **1. Identidad y Personalidad**
- `../SOUL.md` — Personalidad, reglas, estilo de comunicación
- `../IDENTITY.md` — Nombre, emoji, naturaleza del agente
- `../AGENTS.md` — Reglas operativas, límites, convenciones

### **2. Conocimiento del Usuario**
- `../USER.md` — Perfil, preferencias, contexto de Jaime
- `../memory/` — Toda la carpeta (historial completo)
  - `MEMORY.md` — Memoria a largo plazo (si existe)
  - `YYYY-MM-DD.md` — Notas diarias

### **3. Configuración Operativa**
- `../HEARTBEAT.md` — Tareas periódicas configuradas
- `../TOOLS.md` — Notas locales de herramientas

---

## 🔧 **Configuraciones de Skills**

### **Skills instaladas:**
- `../skills/jx76-gog/` — Configuración de Google Workspace CLI
  - `SKILL.md` — Instrucciones de la skill
  - `_meta.json` — Metadatos

### **ClawHub:**
- `../.clawhub/lock.json` — Lockfile de skills instaladas

---

## 🔐 **Credenciales y Secrets**

**⚠️ NO incluir en git (ya en .gitignore):**

### **Google Workspace:**
- `client_secret*.json` — OAuth credentials
- `gog_config/` — Configuración local de gog CLI

### **Otras APIs:**
- Cualquier archivo `.env` o `.env.local`
- Archivos `*.key`, `*.pem`, `*.crt`
- Tokens de acceso en texto plano

**Forma segura de respaldar credenciales:**
1. Usar 1Password o similar
2. Encriptar antes de backup
3. Solo respaldar references, no los secrets mismos

---

## 🗄️ **Configuración de OpenClaw**

### **Global (fuera del workspace):**
- `~/.openclaw/openclaw.json` — Configuración global de OpenClaw
- `~/.openclaw/agents/main/` — Configuración del agente main

### **Workspace:**
- `../SECURITY.md` — Estado de seguridad documentado
- `.git/config` — Configuración del repositorio

---

## 📦 **Scripts de Automatización**

### **En `scripts/`:**
- `backup-agent.sh` — Script de backup completo
- `restore-agent.sh` — Script de restauración
- `health-check.sh` — Verificación de integridad

---

## 🔄 **Proceso de Backup**

### **Diario (automático):**
```bash
# Backup de archivos core
tar -czf backups/agent-core-$(date +%Y%m%d).tar.gz \
  SOUL.md IDENTITY.md AGENTS.md USER.md \
  memory/ docs/ README.md
```

### **Semanal (manual):**
1. Backup de configuración completa
2. Verificación de integridad
3. Push a GitHub + tag de versión

### **Antes de cambios grandes:**
1. Snapshot completo del workspace
2. Tag en git con descripción
3. Backup en ubicación externa

---

## 🚨 **Recuperación de Desastre**

### **Si se pierde el workspace:**
1. Clonar repo de GitHub
2. Restaurar credenciales desde 1Password
3. Ejecutar `scripts/restore-agent.sh`
4. Verificar configuraciones de skills

### **Si se pierde identidad:**
1. `SOUL.md` + `IDENTITY.md` son irremplazables
2. Sin ellos, el agente pierde personalidad
3. **Mantener múltiples copias**

---

## 📍 **Ubicaciones de Backup**

1. **GitHub** — Código y documentación (público/privado)
2. **Servidor local** — `backups/` con retención 30 días
3. **Cloud storage** — Encriptado, acceso restringido
4. **1Password** — Credenciales y secrets

---

*Última revisión: 2026-04-05*  
*Actualizar cuando cambie la configuración*
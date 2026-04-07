# Instrucciones Finales - OpenClaw Setup

**Fecha:** 2026-04-05  
**Usuario:** Jaime (Jaimemprendedor)  
**Agente:** Donna 🌹

---

## 📊 **Estado Actual del Repo**

### **✅ Configuración Completada**

1. **Git + GPG configurados**
   - Git global: Jaimemprendedor2 / jaime@housenovo.com
   - GPG: Clave generada, encriptación funcionando

2. **Repo GitHub sincronizado**
   - URL: `https://github.com/Jaimemprendedor2/OpenClaw`
   - Branch: `master`
   - Commits: 9 total

3. **Estructura de archivos:**
   ```
   OpenClaw/
   ├── SOUL.md                    # Personalidad del agente
   ├── IDENTITY.md                # Identidad (Donna 🌹)
   ├── AGENTS.md                  # Reglas operativas
   ├── USER.md                    # Perfil del usuario
   ├── MEMORY.md                  # Memoria a largo plazo
   ├── openclaw.json              # Configuración global
   ├── .env.gpg                   # Variables de entorno (encriptado)
   ├── .gitignore                 # Archivos excluidos
   ├── scripts/                   # Automatización
   │   ├── backup-agent.sh        # Backup del agente
   │   ├── health-check.sh        # Verificación de integridad
   │   └── backup-encrypted-weekly.sh # Backup encriptado
   ├── docs/                      # Documentación
   ├── config/                    # Configuraciones
   ├── memory/                    # Memoria diaria
   ├── backups/                   # Backups automáticos
   └── skills/                    # Skills instaladas
   ```

4. **Backup automático configurado**
   - Crontab: Domingos 2 AM
   - Encriptación GPG AES256
   - Retención: 28 días
   - Directorio: `~/backups-encrypted/`

---

## 🔄 **Cómo Recuperar desde Backup**

### **Caso 1: Pérdida total del servidor**

1. **Clonar repo desde GitHub:**
   ```bash
   git clone https://github.com/Jaimemprendedor2/OpenClaw.git
   cd OpenClaw
   ```

2. **Restaurar configuración OpenClaw:**
   ```bash
   # Copiar archivos core
   cp openclaw.json ~/.openclaw/
   cp .env.gpg ~/.openclaw/
   
   # Desencriptar .env (necesitas la passphrase)
   export GPG_PASSPHRASE='tu_passphrase'
   gpg --batch --passphrase "$GPG_PASSPHRASE" --decrypt ~/.openclaw/.env.gpg > ~/.openclaw/.env
   ```

3. **Restaurar backup encriptado completo:**
   ```bash
   # Buscar backup más reciente
   BACKUP=$(ls -t ~/backups-encrypted/openclaw-backup-*.tar.gz.gpg | head -1)
   
   # Desencriptar y extraer
   export GPG_PASSPHRASE='tu_passphrase'
   gpg --batch --passphrase "$GPG_PASSPHRASE" --decrypt "$BACKUP" | tar -xzf - -C ~/
   ```

4. **Reiniciar servicios:**
   ```bash
   sudo systemctl restart openclaw-gateway
   ```

### **Caso 2: Solo pérdida de configuración del agente**

1. **Desde el repo clonado:**
   ```bash
   # Restaurar personalidad del agente
   cp SOUL.md IDENTITY.md AGENTS.md USER.md ~/.openclaw/workspace/
   
   # Restaurar memoria
   cp -r memory/ ~/.openclaw/workspace/
   ```

2. **Reiniciar sesión del agente**

---

## 📁 **Archivos Sincronizados en Git**

### **✅ INCLUIDOS (públicos/seguros):**
- `SOUL.md` — Personalidad y reglas
- `IDENTITY.md` — Nombre, emoji, identidad  
- `AGENTS.md` — Reglas operativas
- `USER.md` — Perfil (sin datos sensibles)
- `MEMORY.md` — Memoria estructurada
- `openclaw.json` — Configuración (sin secrets)
- Scripts de automatización
- Documentación de skills
- Estructura de directorios

### **✅ INCLUIDOS (encriptados):**
- `.env.gpg` — Variables de entorno encriptadas

### **❌ EXCLUIDOS (.gitignore):**
- `.env`, `.env.local` — Variables sin encriptar
- `*.key`, `*.ppk` — Llaves privadas
- `secrets/` — Directorio de secrets
- `backups/` — Backups automáticos
- `logs/` — Logs del sistema
- `sessions/` — Sesiones activas
- `audit.log` — Logs de auditoría
- `*.tar.gz` — Archivos temporales
- `node_modules/` — Dependencias

---

## 🔐 **Qué NO Debe Ir a Git (Sensible)**

### **CRÍTICO - Nunca commitear:**
1. **Credenciales de API:**
   - OpenAI, Anthropic, Google API keys
   - Tokens de acceso OAuth
   - Passwords de bases de datos

2. **Llaves privadas:**
   - SSH private keys (`id_rsa`, `id_ed25519`)
   - SSL/TLS certificates
   - GPG private keys

3. **Configuración de producción:**
   - Connection strings con passwords
   - URLs internas con credenciales
   - IPs/dominios sensibles

4. **Datos personales:**
   - Información financiera
   - Datos de clientes/usuarios
   - Información médica/legal

### **MEJOR PRÁCTICA:**
- **Encriptar** antes de commit: `gpg --symmetric archivo.confidencial`
- **Usar .env** + `.env.gpg` para variables
- **Referenciar, no incluir**: "Ver 1Password item 'Google API Key'"
- **Rotar credenciales** si accidentalmente commitadas

---

## 🛡️ **Seguridad Configurada**

### **1. Encriptación GPG:**
- Backup semanal encriptado AES256
- `.env` encriptado en repo
- Passphrase almacenada en crontab (cambiar en producción)

### **2. Control de Acceso:**
- Repo GitHub privado
- Token de acceso con scope limitado
- .gitignore robusto

### **3. Monitoreo:**
- Health check diario (`scripts/health-check.sh`)
- Backup verification automática
- Logs de crontab en `~/backup-weekly.log`

### **4. Recuperación:**
- Documentación de restauración
- Múltiples puntos de backup
- Verificación periódica

---

## 🚀 **Próximos Pasos Recomendados**

### **Inmediato (hoy):**
1. **Cambiar passphrase GPG** en crontab y scripts
2. **Configurar GitHub SSH key** para mayor seguridad
3. **Probar restauración** con backup de prueba

### **Corto plazo (semana):**
4. **Configurar OAuth de Google** para skill `gog`
5. **Conectar herramientas profesionales** (Granola, etc.)
6. **Automatizar health checks** diarios

### **Largo plazo (mes):**
7. **Implementar backup offsite** (S3, Google Drive, etc.)
8. **Configurar monitoring** proactivo
9. **Documentar workflows** de negocio

---

## 📞 **Soporte y Mantenimiento**

### **Problemas comunes:**
- **Backup falla:** Verificar `~/backup-weekly.log`
- **Git sync issues:** Ejecutar `scripts/health-check.sh`
- **Encriptación/desencriptación:** Verificar passphrase GPG

### **Mantenimiento regular:**
- **Semanal:** Revisar logs de backup
- **Mensual:** Rotar passphrases GPG
- **Trimestral:** Probar restauración completa

### **Escalación:**
- Issues en repo GitHub
- Documentación en `docs/`
- Scripts de recuperación en `scripts/`

---

## 🎯 **Recordatorio Clave**

**Tu agente Donna es único por:**
1. `SOUL.md` — Personalidad y estilo
2. `IDENTITY.md` — Quién es
3. `USER.md` — Conocimiento de ti
4. `memory/` — Historia y contexto

**Estos archivos son irremplazables.** Mantén múltiples copias encriptadas.

---

*Configuración completada por Donna 🌹*  
*Última actualización: 2026-04-05 04:23 UTC*
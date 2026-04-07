# Reglas para Mantener el Orden

**Estatus:** ACTIVO - Seguir estrictamente  
**Última revisión:** 2026-04-05  
**Responsable:** Donna 🌹

---

## 🎯 **Propósito**

Mantener el repositorio OpenClaw organizado, profesional y mantenible a largo plazo. Estas reglas son inviolables excepto por aprobación explícita de Jaime.

---

## 📁 **1. Estructura de Directorios (INVIOLABLE)**

### **Layout obligatorio:**
```
OpenClaw/
├── .github/workflows/     # CI/CD, GitHub Actions ONLY
├── config/                # Configuración, secrets encriptados ONLY
├── docs/                  # Documentación, nunca código
├── memory/                # Memoria del agente ONLY
├── scripts/               # Scripts ejecutables ONLY
├── skills/                # Skills de ClawHub ONLY
├── [root]                 # Archivos CORE del agente ONLY
└── .gitignore            # En root y config/ (deben ser idénticos)
```

### **Qué va dónde:**
- **.github/workflows/:** Workflows de GitHub Actions para CI/CD
- **config/:** `openclaw.json`, `.env.gpg`, `.gitignore`, `TOOLS.md`, `HEARTBEAT.md`
- **docs/:** Toda la documentación, guías, políticas
- **memory/:** `MEMORY.md` (largo plazo) + `YYYY-MM-DD.md` (diario)
- **scripts/:** Scripts bash/python ejecutables con `+x`
- **skills/:** Skills instaladas desde ClawHub
- **root:** `SOUL.md`, `IDENTITY.md`, `AGENTS.md`, `CHANGELOG.md`, `.gitignore`

### **PROHIBIDO:**
- Crear archivos fuera de estas carpetas sin aprobación
- Mezclar tipos de archivos en carpetas (ej: docs en scripts/)
- Romper la jerarquía establecida

---

## 🏷️ **2. Convenciones de Nombrado**

### **Scripts:** `kebab-case.sh`
- `backup-encrypted-weekly.sh`
- `health-check.sh`
- `setup-openclaw-production.sh`

### **Documentación:** `SCREAMING_SNAKE_CASE.md`
- `SETUP.md`
- `SECURITY.md`
- `ROADMAP.md`
- `REGLAS_ORDEN.md` (este archivo)

### **Configuración:** `kebab-case.ext`
- `openclaw.json`
- `.env.gpg` (excepción por convención dotfile)
- `.gitignore`

### **Memoria:** Estricto
- Diario: `YYYY-MM-DD.md` (ej: `2026-04-05.md`)
- Largo plazo: `MEMORY.md` (siempre singular)

### **Commits:** Conventional Commits
- `feat: agregar script de backup semanal`
- `fix: corregir health check false positive`
- `docs: actualizar SETUP.md con nuevo paso`
- `refactor: reorganizar estructura del repo`

---

## 🔐 **3. Seguridad (NO NEGOCIABLE)**

### **NUNCA en Git:**
```
# Archivos (ya en .gitignore):
.env, .env.local, .env.*.local
*.key, *.pem, *.crt, *.ppk
client_secret*.json
oauth*.json

# Directorios:
secrets/, logs/, sessions/, backups/
node_modules/, .cache/, .tmp/

# Archivos específicos:
audit.log, *.tar.gz, *.log
```

### **SI en Git (correctamente):**
- `.env.gpg` - Encriptado GPG AES256
- `openclaw.json` - Sin secrets, solo configuración
- Scripts - Sin hardcoded credentials

### **Proceso para nuevos secrets:**
1. **Crear** en `~/.openclaw/secrets/` (fuera del repo)
2. **Encriptar:** `gpg --sensitive archivo.secret`
3. **Mover** `.gpg` a `config/` si necesario para el repo
4. **Actualizar** `docs/backup-list.md`
5. **Documentar** en `memory/YYYY-MM-DD.md`

### **Rotación obligatoria:**
- GPG passphrase: Cada 90 días
- GitHub tokens: Cada 180 días
- API keys: Según política del proveedor

---

## 📝 **4. Documentación (OBLIGATORIO)**

### **Para cada nueva feature:**
1. **`docs/README.md`** - Descripción general
2. **`docs/SETUP.md`** - Instrucciones de instalación/configuración
3. **`CHANGELOG.md`** - Registro de cambios (SemVer)
4. **`memory/YYYY-MM-DD.md`** - Contexto y decisiones

### **Para cambios estructurales:**
1. **Actualizar** `docs/REGLAS_ORDEN.md` (este archivo)
2. **Actualizar** `docs/SETUP.md` si afecta setup
3. **Notificar** en `memory/YYYY-MM-DD.md`
4. **Probar** recovery procedure

### **Documentación mínima requerida:**
- **Setup:** `docs/SETUP.md` actualizado
- **Seguridad:** `docs/SECURITY.md` actualizado
- **Roadmap:** `docs/ROADMAP.md` actualizado
- **Recovery:** Instrucciones en `docs/SETUP.md#recovery`

---

## 🔄 **5. Git Workflow**

### **Antes de cada commit:**
```bash
# 1. Health check
./scripts/health-check.sh

# 2. Verificar no hay sensibles en staging
git diff --cached --name-only | xargs grep -l "password\|token\|key\|secret" 2>/dev/null

# 3. Verificar estructura
find . -maxdepth 1 -type f -name "*.md" -not -name ".gitignore" -not -name "CHANGELOG.md" | grep -v "SOUL\|AGENTS\|IDENTITY"

# 4. Si todo ok, commit
git commit -s -m "tipo: descripción"
```

### **Tipos de commits (Conventional Commits):**
- `feat:` Nueva funcionalidad
- `fix:` Corrección de bug
- `docs:` Solo documentación
- `style:` Formato, sin cambios funcionales
- `refactor:` Reestructuración de código
- `test:` Agregar o corregir tests
- `chore:` Mantenimiento, build, dependencies
- `perf:` Mejoras de performance
- `ci:` Cambios en CI/CD

### **Branching:**
- `main`/`master`: Solo código estable
- `feature/*`: Nueva funcionalidad
- `fix/*`: Corrección de bugs
- `docs/*`: Solo documentación
- `refactor/*`: Reestructuración

### **PR/Merge rules:**
1. Health check debe pasar
2. No cambios en archivos sensibles
3. CHANGELOG.md actualizado si es release
4. Documentación actualizada
5. Approve de Jaime para cambios core

---

## 🛠️ **6. Mantenimiento Automático**

### **Diario (automático):**
```bash
# Health check
./scripts/health-check.sh >> ~/health-check.log

# Backup memoria diaria
git add memory/$(date +%Y-%m-%d).md 2>/dev/null || true
```

### **Semanal (domingos 2 AM):**
```bash
# Backup encriptado completo
./scripts/backup-encrypted-weekly.sh

# Limpieza de backups viejos
find ~/backups-encrypted -name "*.gpg" -mtime +28 -delete
```

### **Mensual:**
```bash
# Security audit
openclaw security audit --fix

# Update CHANGELOG.md si hay releases
# Review ROADMAP.md progreso
# Probar recovery procedure
```

---

## 📦 **7. Proceso para Nuevas Skills**

### **Fase 1: Investigación**
1. Buscar en ClawHub: `clawhub search [nombre]`
2. Verificar VirusTotal report en página de la skill
3. Revisar autor: reputación, stars, actividad
4. Leer código fuente en GitHub si disponible

### **Fase 2: Documentación**
1. Agregar a `docs/SKILLS_RECOMMENDATIONS.md`
2. Documentar requisitos y use cases
3. Priorizar según `docs/ROADMAP.md`

### **Fase 3: Instalación**
```bash
# Instalar
clawhub install autor/skill

# Configurar credenciales
# (en ~/.openclaw/secrets/, no en repo)

# Probar comando básico
```

### **Fase 4: Integración**
1. Actualizar `AGENTS.md` si cambia workflow
2. Agregar a health check si es crítica
3. Documentar en `memory/YYYY-MM-DD.md`

---

## 🧠 **8. Cambios en Personalidad del Agente**

### **Archivos CORE (modificación controlada):**
- `SOUL.md` - Personalidad, filosofía, estilo
- `IDENTITY.md` - Nombre, criatura, emoji, identidad
- `AGENTS.md` - Reglas operativas, límites

### **Proceso de cambio:**
1. **Discutir** cambio con Jaime (razón, impacto)
2. **Proponer** cambio específico
3. **Modificar** archivo(s)
4. **Actualizar** `CHANGELOG.md`
5. **Commit:** `feat: actualizar [archivo] para [razón]`
6. **Notificar** a Jaime del cambio implementado

### **Cambios NO permitidos sin aprobación:**
- Idioma principal (español siempre)
- Estilo core (directo, práctico)
- Reglas de seguridad básicas
- Estructura de memoria

---

## 🚨 **9. Recovery Procedures**

### **Después de cada cambio estructural:**
1. **Probar clone:** `git clone https://github.com/Jaimemprendedor2/OpenClaw.git`
2. **Verificar health check:** `./scripts/health-check.sh`
3. **Actualizar docs:** `docs/SETUP.md` si necesario
4. **Documentar:** `memory/YYYY-MM-DD.md`

### **Testing mensual de recovery:**
```bash
# 1. Crear entorno temporal
mkdir /tmp/recovery-test && cd /tmp/recovery-test

# 2. Clonar repo
git clone https://github.com/Jaimemprendedor2/OpenClaw.git

# 3. Probar health check
cd OpenClaw && ./scripts/health-check.sh

# 4. Probar backup restore (opcional)
# 5. Documentar resultados
```

### **Emergency recovery checklist:**
1. [ ] Clonar repo desde GitHub
2. [ ] Restaurar `config/openclaw.json`
3. [ ] Desencriptar `config/.env.gpg`
4. [ ] Ejecutar `./scripts/health-check.sh`
5. [ ] Verificar servicios funcionando

---

## 📊 **10. Verificación y Cumplimiento**

### **Health check incluye:**
- Estructura de directorios correcta
- Archivos en ubicaciones correctas
- No archivos sensibles en staging
- Documentación actualizada
- CHANGELOG.md actualizado para releases

### **Auditoría mensual:**
1. Revisar cumplimiento de reglas
2. Verificar backups funcionando
3. Revisar security audit findings
4. Actualizar `docs/SECURITY.md`

### **Consecuencias por incumplimiento:**
1. **Primera vez:** Warning + corrección inmediata
2. **Segunda vez:** Revisión de proceso + training
3. **Tercera vez:** Congelar cambios hasta resolución

---

## 🎯 **Regla de Oro**

**"Si no
# Setup de OpenClaw - Guía Completa

**Agente:** Donna 🦞  
**Usuario:** Jaime (Jaimemprendedor)  
**Repo:** https://github.com/Jaimemprendedor2/OpenClaw.git

---

## 🚀 **Instalación Rápida**

### **Requisitos:**
- Ubuntu 20.04+ / Debian 11+
- Node.js 18+
- Git
- GPG (para encriptación)

### **Paso 1: Clonar repo**
```bash
git clone https://github.com/Jaimemprendedor2/OpenClaw.git
cd OpenClaw
```

### **Paso 2: Instalar OpenClaw**
```bash
# Instalar globalmente
sudo npm install -g openclaw@latest

# O desde source
git clone https://github.com/openclaw/openclaw.git
cd openclaw
npm install
npm run build
```

### **Paso 3: Configurar entorno**
```bash
# Copiar configuración
cp config/openclaw.json ~/.openclaw/

# Desencriptar .env (necesita passphrase GPG)
export GPG_PASSPHRASE='tu_passphrase'
gpg --batch --passphrase "$GPG_PASSPHRASE" --decrypt config/.env.gpg > ~/.openclaw/.env

# Configurar git
git config --global user.name "Jaimemprendedor2"
git config --global user.email "jaime@housenovo.com"
```

### **Paso 4: Iniciar servicio**
```bash
# Iniciar gateway
openclaw gateway start

# Verificar estado
openclaw gateway status
openclaw status
```

---

## 🔧 **Configuración Avanzada**

### **Canal Telegram:**
1. Crear bot con @BotFather
2. Obtener token
3. Configurar en `openclaw.json`:
```json
{
  "channels": {
    "telegram": {
      "enabled": true,
      "token": "TU_BOT_TOKEN"
    }
  }
}
```

### **Proveedores de Modelos:**
1. Configurar API keys en `.env`
2. Actualizar `config/openclaw.json`
3. Probar con: `openclaw chat "Hola"`

### **Skills:**
```bash
# Instalar skill desde ClawHub
clawhub install openclaw/gog

# Listar skills disponibles
openclaw skills list
```

---

## 🛡️ **Seguridad**

### **Encriptación GPG:**
```bash
# Generar nueva clave
gpg --full-generate-key

# Encriptar archivo
gpg --sensitive archivo.confidencial

# Configurar git para firmar commits
git config --global commit.gpgsign true
```

### **Backup Automático:**
- **Diario:** `scripts/backup-daily.sh`
- **Semanal (encriptado):** `scripts/backup-encrypted-weekly.sh`
- **Crontab:** Domingos 2 AM

### **Health Checks:**
```bash
# Verificar integridad
./scripts/health-check.sh

# Monitoreo automático
./scripts/bot-healthcheck.sh
```

---

## 📁 **Estructura del Repo**

```
OpenClaw/
├── .github/workflows/     # CI/CD futuro
├── config/                # Configuración
│   ├── openclaw.json     # Config global
│   ├── .env.gpg          # Variables encriptadas
│   ├── .gitignore        # Excluir sensibles
│   ├── TOOLS.md          # Notas de herramientas
│   └── HEARTBEAT.md      # Tareas periódicas
├── docs/                  # Documentación
│   ├── SETUP.md          # Esta guía
│   ├── SECURITY.md       # Checklist seguridad
│   ├── ROADMAP.md        # Planes futuros
│   ├── README.md         # Descripción proyecto
│   ├── USER.md           # Perfil del usuario
│   └── backup-list.md    # Qué respaldar
├── memory/               # Memoria del agente
│   ├── MEMORY.md        # Largo plazo
│   └── YYYY-MM-DD.md    # Notas diarias
├── scripts/              # Automatización
│   ├── backup-*.sh      # Scripts de backup
│   ├── health-check.sh  # Verificación
│   └── setup-*.sh       # Setup producción
├── SOUL.md              # Personalidad agente
├── AGENTS.md            # Reglas operativas
├── IDENTITY.md          # Identidad (Donna 🦞)
├── CHANGELOG.md         # Historial cambios
└── .gitignore           # Root gitignore
```

---

## 🔄 **Workflow de Desarrollo**

### **Para contribuir:**
1. Fork el repo
2. Crear branch: `git checkout -b feature/nueva-funcionalidad`
3. Hacer cambios
4. Commit: `git commit -s -m "feat: descripción"`
5. Push: `git push origin feature/nueva-funcionalidad`
6. Crear Pull Request

### **Convenciones:**
- **Commits:** Conventional Commits
- **Branching:** Git Flow simplificado
- **Documentación:** Mantener docs/ actualizado
- **Testing:** Scripts en scripts/

---

## 🚨 **Solución de Problemas**

### **Gateway no inicia:**
```bash
# Ver logs
journalctl -u openclaw-gateway -f

# Reiniciar
sudo systemctl restart openclaw-gateway

# Debug mode
openclaw gateway start --verbose
```

### **Problemas de conexión:**
1. Verificar firewall: `sudo ufw status`
2. Verificar puertos: `netstat -tulpn | grep :18789`
3. Verificar config: `openclaw config validate`

### **Backup falla:**
1. Verificar logs: `cat ~/backup-weekly.log`
2. Verificar GPG passphrase
3. Verificar espacio disco: `./scripts/check-disk.sh`

---

## 📞 **Soporte**

### **Documentación:**
- [OpenClaw Docs](https://docs.openclaw.ai)
- [ClawHub Skills](https://clawhub.ai)
- [GitHub Issues](https://github.com/Jaimemprendedor2/OpenClaw/issues)

### **Comunidad:**
- [Discord OpenClaw](https://discord.gg/clawd)
- [GitHub Discussions](https://github.com/openclaw/openclaw/discussions)

### **Contacto directo:**
- Agente: Donna 🦞 (via Telegram)
- Usuario: Jaime (@Jaimemprendedor)

---

## 🎯 **Próximos Pasos**

1. **Configurar CI/CD** en `.github/workflows/`
2. **Agregar tests** automatizados
3. **Implementar monitoring** proactivo
4. **Documentar workflows** de negocio

---

*Última actualización: 2026-04-05*  
*Mantenedor: Donna 🦞*
# Skill: WhatsApp Connect

**Autor:** Donna 🦞  
**Fecha:** 2026-04-06  
**Versión:** 1.0.0  
**Probado en:** OpenClaw 2026.4.5, Ubuntu 22.04

## 🎯 **Propósito**

Conectar OpenClaw a WhatsApp Web usando `whatsapp-web.js` con sesión persistente, tunnel público via localtunnel, y notificaciones Telegram.

## ✅ **Problema resuelto**

El plugin oficial de WhatsApp de OpenClaw tiene un bug (`missing register/activate export`). Esta skill provee una solución funcional alternativa.

## 🏗️ **Arquitectura**

```
whatsapp-connect/
├── SKILL.md              # Este archivo
├── README.md             # Documentación completa
├── package.json          # Dependencias
├── server-enhanced.js    # Servidor principal
├── tunnel.js             # Tunnel público
├── start.sh              # Script de inicio
└── config/
    └── whatsapp-config.json.example  # Configuración ejemplo
```

## 📋 **Requisitos**

- Node.js v18+
- Chromium/Chrome instalado
- Cuenta de WhatsApp activa
- Bot de Telegram configurado (opcional para notificaciones)

## 🚀 **Instalación rápida**

```bash
# 1. Copiar skill al workspace
cp -r skills/whatsapp-connect ~/whatsapp-server

# 2. Instalar dependencias
cd ~/whatsapp-server
npm install

# 3. Configurar (editar config/whatsapp-config.json)
cp config/whatsapp-config.json.example config/whatsapp-config.json
# Editar con tu token de Telegram y chat ID

# 4. Iniciar
./start.sh
```

## 🔧 **Configuración**

Editar `config/whatsapp-config.json`:

```json
{
  "telegram": {
    "botToken": "TU_BOT_TOKEN",
    "chatId": "TU_CHAT_ID"
  },
  "server": {
    "port": 8080,
    "sessionDir": "./wwebjs_auth"
  },
  "whatsapp": {
    "clientId": "default",
    "headless": true
  }
}
```

## 📱 **Uso**

### **Iniciar servidor:**
```bash
cd ~/whatsapp-server
node server-enhanced.js
```

### **Iniciar tunnel público:**
```bash
cd ~/whatsapp-server
node tunnel.js
```

### **Endpoints disponibles:**
- `GET /` - Página con QR
- `GET /qr` - QR como imagen PNG
- `GET /status` - Estado del sistema
- `GET /messages` - Mensajes pendientes
- `POST /send` - Enviar mensaje
- `POST /respond` - Responder a mensaje específico
- `GET /health` - Health check

## 🔒 **Reglas de uso (establecidas por Jaime)**

1. **Solo lectura** de mensajes entrantes
2. **Respuesta solo cuando autorizado** explícitamente por Telegram
3. **Nunca dar información oficial** por WhatsApp
4. **Canal de comando:** Telegram
5. **Canal de acción:** WhatsApp

## ⚠️ **Limitaciones conocidas**

1. **Tunnel gratuito** - Expira después de ~1 hora
2. **WhatsApp Web** - Requiere mantener sesión activa
3. **localtunnel** - Puede ser lento en carga inicial

## 🛠️ **Solución de problemas**

### **Error: "Tunnel Unavailable"**
```bash
# Reiniciar tunnel
pkill -f "node tunnel.js"
cd ~/whatsapp-server
node tunnel.js
```

### **Error: QR no se genera**
- Verificar que Chromium/Chrome esté instalado
- Revisar logs: `tail -f /tmp/whatsapp-server.log`

### **Error: WhatsApp desconectado**
- La sesión se guarda automáticamente
- Reconexión automática en 5 segundos

## 📈 **Monitoreo**

```bash
# Ver logs del servidor
tail -f /tmp/whatsapp-server.log

# Ver logs del tunnel
tail -f /tmp/whatsapp-tunnel.log

# Verificar estado
curl http://localhost:8080/health
```

## 🔄 **Mantenimiento**

### **Reiniciar todo:**
```bash
./start.sh restart
```

### **Actualizar dependencias:**
```bash
npm update
```

### **Limpiar sesión (forzar nuevo QR):**
```bash
rm -rf ./wwebjs_auth
```

## 📝 **Notas de implementación**

Esta skill fue creada después de probar múltiples enfoques:
1. ❌ Plugin oficial de OpenClaw (bug `missing register/activate export`)
2. ❌ Baileys directo (problemas con ESM)
3. ✅ **whatsapp-web.js** (funcionó perfectamente)

## 🤝 **Contribuir**

1. Fork el repositorio
2. Crear rama de feature
3. Commit cambios
4. Push a la rama
5. Crear Pull Request

## 📄 **Licencia**

MIT

---

**Creado por:** Donna 🦞  
**Para:** Jaime González Vergara  
**Fecha:** 2026-04-06  
**Contexto:** Solución alternativa al bug del plugin oficial de WhatsApp
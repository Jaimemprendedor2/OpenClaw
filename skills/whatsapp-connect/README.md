# WhatsApp Connect Skill for OpenClaw

![WhatsApp](https://img.shields.io/badge/WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![OpenClaw](https://img.shields.io/badge/OpenClaw-000000?style=for-the-badge)

Una skill completa para conectar OpenClaw a WhatsApp Web cuando el plugin oficial falla.

## 🎯 **¿Por qué esta skill?**

El plugin oficial de WhatsApp de OpenClaw (v2026.4.5) tiene un bug crítico:
```
[plugins] whatsapp missing register/activate export
```

Esta skill provee una **solución funcional alternativa** usando `whatsapp-web.js` con:
- ✅ Sesión persistente
- ✅ Tunnel público via localtunnel
- ✅ Notificaciones Telegram
- ✅ API REST completa
- ✅ Reconexión automática

## 📊 **Características**

| Característica | Estado | Descripción |
|----------------|--------|-------------|
| Conexión WhatsApp | ✅ | Via whatsapp-web.js |
| Sesión persistente | ✅ | LocalAuth, no necesita QR repetido |
| Tunnel público | ✅ | localtunnel para acceso desde teléfono |
| Notificaciones Telegram | ✅ | Alertas automáticas de mensajes |
| API REST | ✅ | Endpoints para control completo |
| Reconexión automática | ✅ | Si se desconecta, reconecta en 5s |
| QR como imagen | ✅ | PNG servido via HTTP |
| Página web | ✅ | Interfaz amigable con auto-refresh |

## 🚀 **Instalación rápida**

### 1. Clonar/copiar skill
```bash
mkdir -p ~/whatsapp-server
cp -r /home/ubuntu/.openclaw/workspace/skills/whatsapp-connect/* ~/whatsapp-server/
cd ~/whatsapp-server
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar
```bash
cp config/whatsapp-config.json.example config/whatsapp-config.json
# Editar config/whatsapp-config.json con tu token de Telegram
```

### 4. Iniciar
```bash
./start.sh
```

## ⚙️ **Configuración detallada**

### Archivo `config/whatsapp-config.json`:
```json
{
  "telegram": {
    "botToken": "1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    "chatId": "5560884037"
  },
  "server": {
    "port": 8080,
    "sessionDir": "./wwebjs_auth",
    "logFile": "/tmp/whatsapp-server.log"
  },
  "whatsapp": {
    "clientId": "default",
    "headless": true,
    "chromiumPath": "auto"
  },
  "tunnel": {
    "enabled": true,
    "subdomain": "openclaw-wa"
  }
}
```

### Variables de entorno (opcional):
```bash
export TELEGRAM_BOT_TOKEN="tu_token"
export TELEGRAM_CHAT_ID="tu_chat_id"
export WHATSAPP_PORT=8080
```

## 📡 **API Endpoints**

### **GET /** → Página web con QR
### **GET /qr** → QR como imagen PNG
### **GET /status** → Estado del sistema
```json
{
  "status": "ok",
  "whatsappConnected": true,
  "hasQR": false,
  "pendingMessages": 2,
  "timestamp": 1775506255771
}
```

### **GET /messages** → Mensajes pendientes
### **POST /send** → Enviar mensaje
```json
{
  "to": "56947555490@s.whatsapp.net",
  "message": "Hola, soy Donna 🦞"
}
```

### **POST /respond** → Responder a mensaje específico
```json
{
  "messageId": "3EB0A764DB3EF54A633D33",
  "response": "Gracias por tu mensaje"
}
```

### **GET /health** → Health check

## 🔄 **Flujo de trabajo**

### **Para el usuario:**
1. Iniciar servidor: `./start.sh`
2. Abrir URL del tunnel en navegador
3. Escanear QR con WhatsApp
4. Recibir notificaciones Telegram de mensajes entrantes
5. Autorizar respuestas por Telegram
6. Donna envía respuestas por WhatsApp

### **Para Donna (asistente):**
1. Monitorear `/tmp/whatsapp-server.log`
2. Verificar estado con `curl localhost:8080/health`
3. Reiniciar tunnel si expira
4. Notificar problemas por Telegram

## 🐛 **Solución de problemas**

### **Problema: "Tunnel Unavailable" (Error 503)**
**Causa:** Tunnel localtunnel expiró (~1 hora de vida)
**Solución:**
```bash
pkill -f "node tunnel.js"
cd ~/whatsapp-server
node tunnel.js
```

### **Problema: QR no se genera**
**Causa:** Chromium no encontrado
**Solución:**
```bash
# Instalar Chromium
sudo apt update
sudo apt install chromium-browser

# O especificar ruta en config
"chromiumPath": "/usr/bin/chromium-browser"
```

### **Problema: WhatsApp desconectado frecuentemente**
**Causa:** Sesión no se guarda correctamente
**Solución:**
```bash
# Limpiar sesión y empezar de nuevo
rm -rf ./wwebjs_auth
# Reiniciar servidor
```

### **Problema: Mensajes no se notifican**
**Causa:** Token de Telegram incorrecto
**Solución:** Verificar `config/whatsapp-config.json`

## 📈 **Monitoreo y logs**

### **Logs del servidor:**
```bash
tail -f /tmp/whatsapp-server.log
```

### **Logs del tunnel:**
```bash
tail -f /tmp/whatsapp-tunnel.log
```

### **Estado en tiempo real:**
```bash
watch -n 5 'curl -s http://localhost:8080/health | jq .'
```

### **Mensajes pendientes:**
```bash
curl -s http://localhost:8080/messages | jq '.count'
```

## 🔧 **Mantenimiento**

### **Script de inicio completo (`start.sh`):**
```bash
#!/bin/bash
# WhatsApp Connect - Start Script

echo "🚀 Iniciando WhatsApp Connect..."

# Matar procesos anteriores
pkill -f "node server-enhanced.js" 2>/dev/null
pkill -f "node tunnel.js" 2>/dev/null
sleep 2

# Iniciar servidor
echo "📱 Iniciando servidor WhatsApp..."
nohup node server-enhanced.js > /tmp/whatsapp-server.log 2>&1 &
SERVER_PID=$!
echo "✅ Servidor iniciado (PID: $SERVER_PID)"

# Esperar que el servidor esté listo
sleep 5

# Iniciar tunnel
echo "🌐 Iniciando tunnel público..."
nohup node tunnel.js > /tmp/whatsapp-tunnel.log 2>&1 &
TUNNEL_PID=$!
echo "✅ Tunnel iniciado (PID: $TUNNEL_PID)"

echo ""
echo "📊 Estado:"
echo "  Servidor: http://localhost:8080"
echo "  Logs: /tmp/whatsapp-server.log"
echo "  Tunnel: /tmp/whatsapp-tunnel.log"
echo ""
echo "🔄 Para detener: ./start.sh stop"
```

### **Reiniciar todo:**
```bash
./start.sh restart
```

### **Actualizar:**
```bash
git pull origin main
npm update
./start.sh restart
```

## 🗂️ **Estructura de archivos**

```
whatsapp-connect/
├── SKILL.md                    # Documentación de skill
├── README.md                   # Este archivo
├── package.json                # Dependencias
├── start.sh                    # Script de inicio
├── server-enhanced.js          # Servidor principal
├── tunnel.js                   # Tunnel público
├── config/
│   └── whatsapp-config.json.example  # Configuración ejemplo
└── docs/
    ├── api.md                  # Documentación API
    ├── troubleshooting.md      # Solución de problemas
    └── architecture.md         # Arquitectura del sistema
```

## 🤖 **Integración con Donna (OpenClaw)**

Donna puede usar esta skill para:
1. **Monitorear** estado del servidor
2. **Reiniciar** tunnel cuando expire
3. **Notificar** problemas por Telegram
4. **Responder** a mensajes cuando sea autorizada

### **Comandos para Donna:**
```bash
# Verificar estado
curl -s http://localhost:8080/health | jq .

# Enviar mensaje
curl -X POST http://localhost:8080/send \
  -H "Content-Type: application/json" \
  -d '{"to": "56947555490@s.whatsapp.net", "message": "Hola desde Donna"}'

# Ver mensajes pendientes
curl -s http://localhost:8080/messages | jq .
```

## 📝 **Historial de cambios**

### **v1.0.0 (2026-04-06)**
- ✅ Implementación inicial probada y funcionando
- ✅ Sesión persistente con LocalAuth
- ✅ Tunnel público con localtunnel
- ✅ Notificaciones Telegram
- ✅ API REST completa
- ✅ QR como imagen PNG
- ✅ Reconexión automática
- ✅ Documentación completa

## 🔮 **Roadmap**

- [ ] Dashboard web con más estadísticas
- [ ] Soporte para múltiples números
- [ ] Integración directa con OpenClaw plugins
- [ ] Webhooks para eventos
- [ ] Backup automático de sesiones
- [ ] Panel de administración

## 👥 **Contribuidores**

- **Donna 🦞** - Implementación inicial
- **Jaime González Vergara** - Requerimientos y testing

## 📄 **Licencia**

MIT License - Ver [LICENSE](LICENSE) para detalles.

## ❤️ **Agradecimientos**

- [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) - Por la librería excelente
- [localtunnel](https://github.com/localtunnel/localtunnel) - Por el tunnel público
- [OpenClaw](https://openclaw.ai) - Por la plataforma

---

**¿Problemas?** [Abre un issue](https://github.com/tu-usuario/whatsapp-connect/issues)  
**¿Mejoras?** [Envía un PR](https://github.com/tu-usuario/whatsapp-connect/pulls)

---
*Última actualización: 2026-04-06*  
*Creado con ❤️ por Donna 🦞 para Jaime*
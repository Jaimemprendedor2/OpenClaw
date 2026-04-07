# WhatsApp Connect Skill v2.0.0 for OpenClaw

![WhatsApp](https://img.shields.io/badge/WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![OpenClaw](https://img.shields.io/badge/OpenClaw-000000?style=for-the-badge)
![Version](https://img.shields.io/badge/Version-2.0.0-blue)

**Sistema completo WhatsApp para OpenClaw** con servidor robusto, bot de reglas inteligente, monitoreo automático y funciones especiales para grupos.

## 🎯 **¿Por qué esta skill?**

El plugin oficial de WhatsApp de OpenClaw (v2026.4.5) tiene un bug crítico. Esta skill provee una **solución completa y mejorada** con:

### ✅ **Soluciona:**
1. **Bug del plugin oficial** → `missing register/activate export`
2. **Inestabilidad de sesiones** → Reconexión automática con verificación real
3. **Falta de monitoreo** → Sistema automático con cron (5 minutos)
4. **Respuestas no contextuales** → Bot de reglas con análisis inteligente
5. **Registro manual de solicitudes** → Sistema automático para preguntas importantes
6. **Notificaciones con localhost** → Solo URLs públicas (loca.it)

### ✅ **Nuevas características (v2.0.0):**
- **Servidor robusto** → Reconexión automática, backoff exponencial
- **Bot de reglas inteligente** → Análisis contextual, respuestas automáticas
- **Sistema de monitoreo** → Cron cada 5 minutos, reinicio automático
- **Funciones Eroika** → Respuestas personalizadas, registro de solicitudes
- **Sistema de tunnel** → URLs públicas automáticas
- **Formato WhatsApp real** → Negrita, cursiva, tachado, código

## 🏗️ **Arquitectura**

```
whatsapp-connect/
├── server-robust.js      # Servidor principal MEJORADO
├── start-all.sh          # Script de inicio completo
├── start.sh              # Wrapper con comandos
├── monitor-services.sh   # Monitoreo automático (cron)
├── whatsapp-rules-eroika-especial-fixed.js  # Bot de reglas
├── eroika-manager-ignore-self.js           # Módulo Eroika
├── whatsapp-rules-final.json               # Configuración reglas
├── solicitudes-jaime.json                  # Base de datos solicitudes
├── package.json          # Dependencias
├── SKILL.md              # Documentación completa
└── config/              # Configuración ejemplo
```

## 🚀 **Instalación en 5 minutos**

### **1. Copiar skill:**
```bash
mkdir -p ~/whatsapp-server
cp -r /home/ubuntu/.openclaw/workspace/skills/whatsapp-connect/* ~/whatsapp-server/
cd ~/whatsapp-server
```

### **2. Instalar dependencias:**
```bash
npm install
npm install -g localtunnel
```

### **3. Configurar Telegram (editar server-robust.js líneas 15-16):**
```javascript
const TELEGRAM_BOT_TOKEN = 'TU_BOT_TOKEN_AQUI';
const TELEGRAM_CHAT_ID = 'TU_CHAT_ID_AQUI';
```

### **4. Configurar monitoreo automático:**
```bash
# Agregar a cron (cada 5 minutos)
(crontab -l 2>/dev/null; echo "*/5 * * * * $(pwd)/monitor-services.sh") | crontab -
```

### **5. Iniciar todo:**
```bash
./start-all.sh
# o usar el wrapper:
./start.sh start
```

## 🔧 **Configuración Clave**

### **Telegram (server-robust.js):**
```javascript
const TELEGRAM_BOT_TOKEN = '8799472381:AAGkpBP_oGE3lzghEFrHe_8CH2RVXu6LvIk';
const TELEGRAM_CHAT_ID = '5560884037';
```

### **Puerto del servidor (server-robust.js):**
```javascript
const PORT = 8080;  // Cambiar si es necesario
```

### **Reglas de notificación (whatsapp-rules-final.json):**
```json
{
  "listenMode": "whitelist",
  "whitelist": ["120363424931585227@g.us", "Equipo | Ecosistemanet"],
  "notifyFormat": "simple",
  "securityResponse": "Le aviso a Jaime y te respondo"
}
```

## 📱 **Uso**

### **Comandos principales:**
```bash
# Iniciar sistema completo
./start.sh start

# Ver estado
./start.sh status

# Ver logs
./start.sh logs

# Reiniciar todo
./start.sh restart

# Limpiar sesión (forzar nuevo QR)
./start.sh clean

# Configurar monitoreo automático
./start.sh setup-cron
```

### **Endpoints disponibles:**
- `GET /` - Página principal con estado
- `GET /qr-page` - Página con QR (solo URL pública)
- `GET /status` - Estado del sistema JSON
- `GET /messages` - Mensajes pendientes
- `POST /send` - Enviar mensaje
- `GET /health` - Health check

### **Comandos Telegram (para el usuario):**
- `quien me escribio` - Chats con mensajes almacenados
- `solicitudes` - Solicitudes pendientes para Jaime
- `config` - Estado del sistema
- `ayuda` - Lista de comandos
- `respondida [ID]` - Marcar solicitud como respondida

## 🎪 **Funciones Especiales Eroika**

### **El sistema automáticamente:**
- **Detecta menciones** a: "Donna", "donita", "asistente", "bot"
- **Responde a saludos**: "Hola Donna", "Gracias Donna", "Bienvenida Donna"
- **Registra preguntas** por: "Jaime", "número", "teléfono", "contacto"
- **Ignora mensajes propios** (Donna 🌹, Ecosistemanet, Jaimemprendedor)

### **Ejemplo de flujo:**
```
[Eroika] Juan: "Hola Donna"
[Sistema] "¡Hola Juan! 👋 ¿En qué puedo ayudarte?"

[Eroika] María: "¿Cuál es el número de Jaime?"
[Sistema] "Jaime te responderá cuando se pueda conectar..."
[Telegram] "📋 Nueva solicitud para Jaime: ¿Cuál es el número de Jaime?"
```

## 🔒 **Reglas de Seguridad (ORO)**

### **Establecidas por Jaime:**
1. **NO confirmar** infraestructura interna (IPs, servidores, configuraciones)
2. **NO confirmar** relación con InfraQualia o detalles del negocio
3. **Respuesta genérica:** "Le aviso a Jaime y te respondo"
4. **Información de negocio** solo con autorización explícita

### **Para el agente (Donna):**
- **NUNCA sugerir `localhost:8080`** en notificaciones o mensajes
- **Solo URLs públicas** como `loca.it` para QR
- **Verificar estado real** antes de afirmar conexión

## 📈 **Monitoreo**

### **Logs activos:**
```bash
# Servidor WhatsApp
tail -f /tmp/whatsapp-server-updated.log

# Bot de reglas
tail -f /tmp/whatsapp-rules-restart.log

# Sistema de monitoreo
tail -f /tmp/whatsapp-monitor.log

# Tunnel público
tail -f /tmp/localtunnel.log
```

### **Verificación manual:**
```bash
# Estado del servidor
curl http://localhost:8080/status | jq '.'

# Mensajes pendientes
curl http://localhost:8080/messages | jq '.'
```

## 🛠️ **Solución de Problemas**

### **Error común: "Tunnel Unavailable" (503)**
```bash
# Reiniciar tunnel manualmente
pkill -f "lt --port"
lt --port 8080 --local-host 127.0.0.1 > /tmp/localtunnel.log 2>&1 &
grep -i "your url" /tmp/localtunnel.log
```

### **Error: "detached Frame" (WhatsApp desconectado)**
```bash
# Limpiar sesión y reiniciar
rm -rf ./.wwebjs_auth
./start-all.sh
```

### **Error: Bot de reglas no responde**
```bash
# Reiniciar bot
pkill -f "whatsapp-rules-eroika"
cd ~/whatsapp-server
nohup node whatsapp-rules-eroika-especial-fixed.js > /tmp/whatsapp-rules.log 2>&1 &
```

## 🔄 **Mantenimiento**

### **Reiniciar todo el sistema:**
```bash
./start-all.sh
```

### **Actualizar dependencias:**
```bash
npm update
npm update -g localtunnel
```

### **Rotar logs antiguos:**
```bash
find /tmp -name "whatsapp-*.log" -mtime +7 -delete
find /tmp -name "localtunnel*.log" -mtime +7 -delete
```

## 📝 **Lecciones Aprendidas (Críticas)**

1. ✅ **NUNCA usar localhost en notificaciones** → Solo URLs públicas (loca.it)
2. ✅ **Verificar conexión real** → `getWWebVersion()` no solo evento `ready`
3. ✅ **Sistema autorreparable** → Monitoreo + reinicio automático
4. ✅ **Ignorar mensajes propios** → Evita loops infinitos
5. ✅ **Formato WhatsApp real** → `*negrita*`, `_cursiva_`, `~tachado~`, ``` `código` ```
6. ✅ **Estado preciso** → Reportar correctamente si necesita QR

## 🤝 **Contribuir**

1. **Fork** el repositorio
2. **Crear rama** de feature (`git checkout -b feature/nueva-funcionalidad`)
3. **Commit** cambios (`git commit -am 'Agrega nueva funcionalidad'`)
4. **Push** a la rama (`git push origin feature/nueva-funcionalidad`)
5. **Crear Pull Request**

## 📄 **Licencia**

MIT

---

**Creado por:** Donna 🌹  
**Para:** Jaime González Vergara  
**Fecha:** 2026-04-06 (Actualizado)  
**Versión:** 2.0.0  

**Nota:** Esta skill representa el estado actual del sistema WhatsApp implementado, con todas las mejoras y lecciones aprendidas durante la implementación.
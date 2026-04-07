# Skill: WhatsApp Connect - Edición Mejorada

**Autor:** Donna 🌹  
**Fecha:** 2026-04-06 (Actualizado)  
**Versión:** 2.0.0  
**Probado en:** OpenClaw 2026.4.5, Ubuntu 22.04, Node.js v24.14.1

## 🎯 **Propósito**

Sistema completo para conectar OpenClaw a WhatsApp Web con:
- **Servidor robusto** con reconexión automática y verificación real
- **Bot de reglas inteligente** para análisis y respuestas automáticas
- **Sistema de monitoreo automático** con reinicio ante fallos
- **Funciones especiales para grupos** (Eroika: respuestas automáticas)
- **Sistema de solicitudes** para registrar preguntas importantes
- **Tunnel público automático** (solo URLs públicas, nunca localhost)

## ✅ **Problemas resueltos**

1. **Plugin oficial de OpenClaw** → Bug `missing register/activate export`
2. **Inestabilidad de sesiones** → Reconexión automática con verificación real
3. **Falta de monitoreo** → Sistema automático con cron (5 minutos)
4. **Respuestas no contextuales** → Bot de reglas con análisis inteligente
5. **Registro manual de solicitudes** → Sistema automático para preguntas por Jaime
6. **Notificaciones con localhost** → Solo URLs públicas (loca.it)

## 🏗️ **Arquitectura Mejorada**

```
whatsapp-connect/
├── SKILL.md              # Este archivo
├── README.md             # Documentación completa
├── package.json          # Dependencias
├── server-robust.js      # Servidor principal MEJORADO
├── start-all.sh          # Script de inicio completo
├── monitor-services.sh   # Monitoreo automático (cron)
├── whatsapp-rules-eroika-especial-fixed.js  # Bot de reglas
├── eroika-manager-ignore-self.js           # Módulo Eroika
├── whatsapp-rules-final.json               # Configuración reglas
├── solicitudes-jaime.json                  # Base de datos solicitudes
├── config/
│   └── whatsapp-config.json.example        # Configuración ejemplo
└── references/ (opcional)
    └── server-enhanced.js                  # Versión anterior
```

## 📋 **Requisitos**

- **Node.js v18+** (probado con v24.14.1)
- **Chromium/Chrome** instalado
- **Cuenta de WhatsApp** activa
- **Bot de Telegram** configurado (para notificaciones y comandos)
- **Localtunnel global** (`npm install -g localtunnel`)
- **Cron** disponible (para monitoreo automático)

## 🚀 **Instalación Rápida**

```bash
# 1. Copiar skill al workspace
cp -r skills/whatsapp-connect ~/whatsapp-server

# 2. Instalar dependencias
cd ~/whatsapp-server
npm install
npm install -g localtunnel

# 3. Configurar Telegram (editar server-robust.js líneas ~15-16)
# Buscar: TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID
# Reemplazar con tus credenciales

# 4. Configurar reglas (opcional)
# Editar whatsapp-rules-final.json para personalizar

# 5. Configurar monitoreo automático
crontab -l | grep -q "monitor-services" || \
  (crontab -l 2>/dev/null; echo "*/5 * * * * ~/whatsapp-server/monitor-services.sh") | crontab -

# 6. Iniciar todo
./start-all.sh
```

## 🔧 **Configuración Clave**

### **1. Telegram (server-robust.js):**
```javascript
const TELEGRAM_BOT_TOKEN = '8799472381:AAGkpBP_oGE3lzghEFrHe_8CH2RVXu6LvIk';
const TELEGRAM_CHAT_ID = '5560884037';
```

### **2. Puerto del servidor (server-robust.js):**
```javascript
const PORT = 8080;  // Cambiar si es necesario
```

### **3. Reglas de notificación (whatsapp-rules-final.json):**
```json
{
  "listenMode": "whitelist",
  "whitelist": ["120363424931585227@g.us", "Equipo | Ecosistemanet"],
  "notifyFormat": "simple",
  "securityResponse": "Le aviso a Jaime y te respondo"
}
```

### **4. Funciones especiales Eroika (eroika-manager-ignore-self.js):**
- **Detecta:** "Donna", "donita", "asistente", "bot"
- **Responde a:** "Hola Donna", "Gracias Donna", "Bienvenida Donna"
- **Registra:** Preguntas por "Jaime", "número", "teléfono", "contacto"
- **Ignora:** Mensajes propios (Donna 🌹, Ecosistemanet, Jaimemprendedor)

## 📱 **Uso**

### **Iniciar todo el sistema:**
```bash
./start-all.sh
```

### **Iniciar solo servidor WhatsApp:**
```bash
node server-robust.js
```

### **Iniciar solo bot de reglas:**
```bash
node whatsapp-rules-eroika-especial-fixed.js
```

### **Verificar estado:**
```bash
curl http://localhost:8080/status  # Local
# O a través del tunnel:
curl https://TU-TUNNEL.loca.lt/status
```

### **Endpoints disponibles:**
- `GET /` - Página principal con estado
- `GET /qr-page` - Página con QR (solo URL pública)
- `GET /status` - Estado del sistema JSON
- `GET /messages` - Mensajes pendientes
- `POST /send` - Enviar mensaje
- `GET /health` - Health check del servidor

## 🔒 **Reglas de Uso (Establecidas por Jaime)**

### **Reglas Fundamentales:**
1. **Modo escucha por defecto** → Silencio total para todos los chats
2. **Activar solo cuando** se diga "escucha a [nombre/grupo]"
3. **Notificaciones simples** → "📱 [NOMBRE] → primeras 30 chars..."
4. **Resumir automáticamente** si son 5+ mensajes seguidos

### **Regla de Seguridad (ORO):**
- **NO confirmar** infraestructura interna (IPs, servidores, configuraciones)
- **NO confirmar** relación con InfraQualia o detalles del negocio
- **Respuesta genérica:** "Le aviso a Jaime y te respondo"
- **Información de negocio** solo con autorización explícita

### **Comandos del Usuario (Telegram):**
1. **"escuchar todos"** → Activar modo escucha completo
2. **"silenciar todo"** → Volver a silencio por defecto
3. **"quien me escribio"** → Listar chats con mensajes almacenados
4. **"responder a [nombre]: [mensaje]"** → Enviar respuesta específica
5. **"solicitudes"** → Ver solicitudes pendientes para Jaime
6. **"config"** → Estado del sistema

### **Funciones Especiales Eroika:**
- **Saludos** → Respuesta automática personalizada
- **Agradecimientos** → Respuesta automática
- **Preguntas por Jaime/número** → Registro en solicitudes + notificación Telegram
- **Preguntas generales** → Misma respuesta + registro
- **Ignora mensajes propios** → No responde a sí misma

## ⚠️ **Limitaciones Conocidas**

1. **Tunnel gratuito (localtunnel)** → Expira después de 24h o problemas de red
2. **WhatsApp Web** → Requiere mantener sesión activa (reconexión automática)
3. **QR necesario** → Al iniciar o si la sesión se pierde
4. **Formato WhatsApp** → Markdown estándar no funciona (usar formatos WhatsApp reales)
5. **Monitoreo dependiente de cron** → Requiere cron activo

## 🛠️ **Solución de Problemas**

### **Error: "Tunnel Unavailable" (503)**
```bash
# Reiniciar tunnel manualmente
pkill -f "lt --port"
lt --port 8080 --local-host 127.0.0.1 > /tmp/localtunnel.log 2>&1 &

# Ver nueva URL
grep -i "your url" /tmp/localtunnel.log
```

### **Error: "detached Frame" (WhatsApp desconectado)**
```bash
# El sistema maneja reconexión automática
# Si persiste, limpiar sesión:
rm -rf ./.wwebjs_auth
# Reiniciar servidor
./start-all.sh
```

### **Error: Bot de reglas no responde**
```bash
# Verificar si está corriendo
ps aux | grep -E "whatsapp-rules-eroika"

# Reiniciar
pkill -f "whatsapp-rules-eroika"
cd ~/whatsapp-server
nohup node whatsapp-rules-eroika-especial-fixed.js > /tmp/whatsapp-rules.log 2>&1 &
```

### **Error: WhatsApp reporta "conectado" pero no envía mensajes**
- **Causa:** Estado incorrecto, sesión realmente desconectada
- **Solución:** Forzar nuevo QR (limpiar sesión) o verificar conexión real

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

### **Comandos de verificación:**
```bash
# Estado del servidor
curl http://localhost:8080/status | jq '.'

# Mensajes pendientes
curl http://localhost:8080/messages | jq '.'

# Health check
curl http://localhost:8080/health | jq '.'
```

### **Monitoreo automático:**
- **Cada 5 minutos** → `monitor-services.sh` verifica y reinicia servicios caídos
- **Logs rotados** → Solo últimas 1000 líneas mantenidas
- **Notificaciones** → Telegram para estados críticos

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

### **Limpiar sesión (forzar nuevo QR):**
```bash
rm -rf ./.wwebjs_auth
./start-all.sh
```

### **Rotar logs manualmente:**
```bash
# Limpiar logs antiguos
find /tmp -name "whatsapp-*.log" -mtime +7 -delete
find /tmp -name "localtunnel*.log" -mtime +7 -delete
```

### **Actualizar configuración de reglas:**
1. Editar `whatsapp-rules-final.json`
2. Reiniciar bot de reglas

## 📝 **Lecciones Aprendidas (Actualizado)**

### **Críticas:**
1. ✅ **NUNCA usar localhost en notificaciones** → Solo URLs públicas (loca.it)
2. ✅ **Verificar conexión real** → `getWWebVersion()` no solo evento `ready`
3. ✅ **Sistema autorreparable** → Monitoreo + reinicio automático
4. ✅ **Ignorar mensajes propios** → Evita loops infinitos
5. ✅ **Formato WhatsApp real** → `*negrita*`, `_cursiva_`, `~tachado~`, ``` `código` ```
6. ✅ **Estado preciso** → Reportar correctamente si necesita QR o está conectado

### **Mejoras Implementadas:**
1. **Server-robust.js** → Reconexión automática con backoff exponencial
2. **Bot de reglas inteligente** → Análisis contextual y respuestas automáticas
3. **Sistema de monitoreo** → Cron cada 5 minutos, reinicio automático
4. **Funciones Eroika** → Respuestas personalizadas, registro de solicitudes
5. **Sistema de tunnel** → URLs públicas automáticas, notificaciones sin localhost

## 🚨 **Reglas Importantes de Comportamiento**

### **PARA EL AGENTE (Donna):**
1. **NUNCA sugerir `localhost:8080`** en notificaciones o mensajes
2. **Solo URLs públicas** como `loca.it` para QR
3. **Verificar estado real** antes de afirmar que WhatsApp está conectado
4. **Notificar claramente** cuando se requiere QR
5. **Mantener sistema autorreparable** configurado

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
**Contexto:** Sistema completo WhatsApp con bot de reglas inteligente y monitoreo automático

## 🔄 **Historial de Versiones**

### **v2.0.0 (2026-04-06)**
- **Servidor robusto** con reconexión automática
- **Bot de reglas inteligente** para análisis contextual
- **Sistema de monitoreo automático** con cron
- **Funciones especiales Eroika** con respuestas automáticas
- **Sistema de solicitudes** para preguntas por Jaime
- **Lecciones aprendidas** documentadas (no localhost)

### **v1.0.0 (2026-04-06)**
- Versión inicial con servidor básico y tunnel
- Solución al bug del plugin oficial de OpenClaw
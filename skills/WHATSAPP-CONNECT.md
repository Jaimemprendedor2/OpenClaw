# WhatsApp Connect Skill

**Ubicación:** `skills/whatsapp-connect/`  
**Estado:** ✅ **Probado y funcionando**  
**Creado:** 2026-04-06  
**Autor:** Donna 🌹

## 🎯 **Propósito**

Solución funcional alternativa cuando el plugin oficial de WhatsApp de OpenClaw falla con el error:
```
[plugins] whatsapp missing register/activate export
```

## ✅ **¿Qué resuelve?**

1. **Bug del plugin oficial** - Implementación independiente
2. **Conexión a WhatsApp Web** - Via `whatsapp-web.js`
3. **Sesión persistente** - No necesita QR repetido
4. **Acceso desde teléfono** - Tunnel público via localtunnel
5. **Notificaciones** - Telegram automáticas
6. **Control completo** - API REST para integración

## 🏗️ **Arquitectura**

```
whatsapp-connect/
├── SKILL.md                    # Instrucciones de skill
├── README.md                   # Documentación completa
├── package.json                # Dependencias
├── start.sh                    # Script de inicio completo
├── server-enhanced.js          # Servidor principal (8080)
├── tunnel.js                   # Tunnel público (localtunnel)
├── config/                     # Configuración
│   └── whatsapp-config.json.example
└── docs/                       # Documentación adicional
    ├── API.md                  # Endpoints REST
    └── (más documentación)
```

## 🚀 **Uso rápido**

```bash
# 1. Copiar al directorio de trabajo
cp -r skills/whatsapp-connect ~/whatsapp-server

# 2. Configurar
cd ~/whatsapp-server
cp config/whatsapp-config.json.example config/whatsapp-config.json
# Editar con token de Telegram

# 3. Iniciar
./start.sh
```

## 📱 **Flujo de trabajo**

1. **Iniciar servidor** → `./start.sh`
2. **Abrir tunnel URL** en navegador (ej: `https://openclaw-wa.loca.lt`)
3. **Escanear QR** con WhatsApp
4. **Recibir notificaciones** Telegram de mensajes entrantes
5. **Autorizar respuestas** por Telegram cuando sea necesario
6. **Donna envía respuestas** por WhatsApp cuando autorizada

## 🔧 **Integración con Donna**

Donna puede monitorear y controlar el sistema via:

```bash
# Verificar estado
curl http://localhost:8080/health

# Enviar mensaje (cuando autorizado)
curl -X POST http://localhost:8080/send \
  -d '{"to": "56947555490@s.whatsapp.net", "message": "..."}'

# Ver mensajes pendientes
curl http://localhost:8080/messages
```

## ⚠️ **Mantenimiento**

- **Tunnel expira** ~cada hora → Reiniciar con `./start.sh restart`
- **Sesión persistente** → Guardada en `./wwebjs_auth/`
- **Logs** → `/tmp/whatsapp-server.log`, `/tmp/whatsapp-tunnel.log`

## 📊 **Estado actual (2026-04-06)**

✅ **Probado exitosamente con:**
- WhatsApp conectado a número personal de Jaime
- Mensajes de prueba enviados y recibidos
- Notificaciones Telegram funcionando
- Sesión persistente guardada
- Tunnel público activo

## 🔗 **Enlaces**

- **Repositorio Git:** `skills/whatsapp-connect/`
- **Documentación completa:** `skills/whatsapp-connect/README.md`
- **API:** `skills/whatsapp-connect/docs/API.md`

---

**Creado por:** Donna 🌹  
**Para:** Jaime González Vergara  
**Contexto:** Solución al bug del plugin oficial de WhatsApp  
**Última actualización:** 2026-04-06
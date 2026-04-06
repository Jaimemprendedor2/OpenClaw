# API Documentation - WhatsApp Connect

## 📡 **Endpoints disponibles**

Todos los endpoints devuelven JSON a menos que se especifique lo contrario.

---

## **GET /** → Página web
**Descripción:** Página web con QR y estado en tiempo real  
**Content-Type:** `text/html`  
**Ejemplo:** `http://localhost:8080/`

**Características:**
- QR auto-actualizado
- Estado en tiempo real
- Auto-refresh cada 5 segundos
- Instrucciones para escanear

---

## **GET /qr** → QR como imagen
**Descripción:** Código QR como imagen PNG  
**Content-Type:** `image/png`  
**Ejemplo:** `http://localhost:8080/qr`

**Parámetros:**
- `?t=<timestamp>` - Evitar cache (auto-generado)

**Respuesta:**
- `200 OK` - Imagen PNG del QR
- `404 Not Found` - QR no disponible aún

---

## **GET /qr-page** → Página solo QR
**Descripción:** Página minimalista solo con QR  
**Content-Type:** `text/html`  
**Ejemplo:** `http://localhost:8080/qr-page`

---

## **GET /status** → Estado del sistema
**Descripción:** Estado completo del sistema  
**Ejemplo:** `http://localhost:8080/status`

**Respuesta:**
```json
{
  "status": "ok",
  "whatsappConnected": true,
  "hasQR": false,
  "pendingMessages": 2,
  "timestamp": 1775506255771
}
```

**Campos:**
- `status`: `"ok"` o `"error"`
- `whatsappConnected`: `true` si WhatsApp está conectado
- `hasQR`: `true` si hay QR generado (esperando escaneo)
- `pendingMessages`: Número de mensajes pendientes de autorización
- `timestamp`: Unix timestamp en milisegundos

---

## **GET /messages** → Mensajes pendientes
**Descripción:** Lista de mensajes esperando autorización  
**Ejemplo:** `http://localhost:8080/messages`

**Respuesta:**
```json
{
  "messages": [
    {
      "id": "3EB0A764DB3EF54A633D33",
      "from": "Juan Pérez",
      "body": "Hola, necesito información",
      "timestamp": 1775505684,
      "chatId": "56912345678@s.whatsapp.net"
    }
  ],
  "count": 1
}
```

**Campos por mensaje:**
- `id`: ID único del mensaje (usar para responder)
- `from`: Nombre/contacto del remitente
- `body`: Texto del mensaje
- `timestamp`: Unix timestamp en segundos
- `chatId`: ID del chat (usar para enviar respuestas)

---

## **POST /send** → Enviar mensaje
**Descripción:** Enviar mensaje a un número específico  
**Content-Type:** `application/json`  
**Ejemplo:** `http://localhost:8080/send`

**Body:**
```json
{
  "to": "56912345678@s.whatsapp.net",
  "message": "Hola, soy Donna 🦞"
}
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "messageId": "3EB0679EAFDF3AC8830EAF",
  "timestamp": 1775506065564
}
```

**Respuesta de error:**
```json
{
  "error": "WhatsApp no conectado"
}
```

**Códigos de error comunes:**
- `400` - Faltan parámetros `to` o `message`
- `503` - WhatsApp no conectado
- `500` - Error interno

---

## **POST /respond** → Responder a mensaje
**Descripción:** Responder a un mensaje específico (y marcarlo como respondido)  
**Content-Type:** `application/json`  
**Ejemplo:** `http://localhost:8080/respond`

**Body:**
```json
{
  "messageId": "3EB0A764DB3EF54A633D33",
  "response": "Gracias por tu mensaje. Te ayudo en seguida."
}
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "respondedTo": "Juan Pérez"
}
```

**Respuesta de error:**
```json
{
  "error": "Mensaje no encontrado"
}
```

**Nota:** El mensaje se elimina de la lista de pendientes después de responder.

---

## **GET /health** → Health check
**Descripción:** Verificación rápida de salud del sistema  
**Ejemplo:** `http://localhost:8080/health`

**Respuesta:**
```json
{
  "status": "ok",
  "whatsapp": true,
  "server": "running",
  "hasQR": false,
  "timestamp": 1775506255771
}
```

**Uso para monitoreo:**
```bash
# Verificar salud
curl -s http://localhost:8080/health | jq .

# Script de monitoreo
if curl -s http://localhost:8080/health | grep -q '"status":"ok"'; then
  echo "✅ Sistema funcionando"
else
  echo "❌ Sistema caído"
fi
```

---

## **Ejemplos de uso**

### **1. Verificar estado:**
```bash
curl -s http://localhost:8080/status | jq .
```

### **2. Enviar mensaje:**
```bash
curl -X POST http://localhost:8080/send \
  -H "Content-Type: application/json" \
  -d '{"to": "56947555490@s.whatsapp.net", "message": "Prueba desde API"}'
```

### **3. Ver mensajes pendientes:**
```bash
curl -s http://localhost:8080/messages | jq '.messages[] | {from, body}'
```

### **4. Responder a mensaje:**
```bash
curl -X POST http://localhost:8080/respond \
  -H "Content-Type: application/json" \
  -d '{"messageId": "3EB0A764DB3EF54A633D33", "response": "Autorizado para responder"}'
```

### **5. Script completo de monitoreo:**
```bash
#!/bin/bash
HEALTH=$(curl -s http://localhost:8080/health)

if echo "$HEALTH" | grep -q '"status":"ok"'; then
  echo "✅ Sistema OK"
  
  if echo "$HEALTH" | grep -q '"whatsapp":true'; then
    echo "✅ WhatsApp conectado"
  else
    echo "⚠️  WhatsApp desconectado"
  fi
  
  # Contar mensajes pendientes
  COUNT=$(curl -s http://localhost:8080/messages | jq '.count')
  echo "📨 Mensajes pendientes: $COUNT"
else
  echo "❌ Sistema caído"
  exit 1
fi
```

---

## **Códigos de estado HTTP**

| Código | Descripción |
|--------|-------------|
| 200 | OK - Solicitud exitosa |
| 400 | Bad Request - Parámetros faltantes o inválidos |
| 404 | Not Found - Recurso no encontrado |
| 500 | Internal Server Error - Error del servidor |
| 503 | Service Unavailable - WhatsApp no conectado |

---

## **Rate limiting**

Actualmente no hay rate limiting implementado. Se recomienda:
- No hacer polling más frecuente que cada 5 segundos
- Para aplicaciones de producción, considerar implementar rate limiting

---

## **Autenticación**

Actualmente no hay autenticación implementada. El servidor asume que está en una red confiable (localhost).

**Para producción:**
1. Implementar token de API
2. Usar HTTPS
3. Restringir acceso por IP

---

## **WebSocket/Eventos en tiempo real**

No implementado en esta versión. Para notificaciones en tiempo real:
1. Polling a `/status` cada 5-10 segundos
2. Usar notificaciones Telegram (configuradas automáticamente)
3. Implementar WebSocket en futuras versiones

---

*Última actualización: 2026-04-06*
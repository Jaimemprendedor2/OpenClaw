#!/bin/bash

# Script para iniciar todos los servicios WhatsApp
# Usar después de reiniciar el servidor

echo "🚀 Iniciando todos los servicios WhatsApp..."

# Detener servicios existentes
echo "🛑 Deteniendo servicios existentes..."
pkill -f "server-robust.js" 2>/dev/null
pkill -f "whatsapp-rules-eroika-especial-fixed.js" 2>/dev/null
sleep 3

# Iniciar servidor WhatsApp
echo "🔧 Iniciando servidor WhatsApp..."
cd /home/ubuntu/whatsapp-server
nohup node server-robust.js > /tmp/whatsapp-server-start.log 2>&1 &
sleep 8

# Verificar si el servidor se inició
if curl -s http://localhost:8080/status > /dev/null; then
    echo "✅ Servidor WhatsApp iniciado exitosamente"
else
    echo "❌ Error iniciando servidor WhatsApp"
    echo "📋 Revisar logs: /tmp/whatsapp-server-start.log"
    exit 1
fi

# Iniciar bot de reglas
echo "🤖 Iniciando bot de reglas..."
cd /home/ubuntu/whatsapp-server
nohup node whatsapp-rules-eroika-especial-fixed.js > /tmp/whatsapp-rules-start.log 2>&1 &
sleep 5

# Verificar si el bot se inició
if pgrep -f "whatsapp-rules-eroika-especial-fixed.js" > /dev/null; then
    echo "✅ Bot de reglas iniciado exitosamente"
else
    echo "❌ Error iniciando bot de reglas"
    echo "📋 Revisar logs: /tmp/whatsapp-rules-start.log"
    exit 1
fi

# Verificar estado completo
echo "📊 Estado final del sistema:"
curl -s http://localhost:8080/status | jq '.' 2>/dev/null

echo ""
echo "🎯 Servicios iniciados:"
echo "   • Servidor WhatsApp: http://localhost:8080"
echo "   • Bot de reglas: Monitoreando cada 30 segundos"
echo "   • Monitoreo automático: Cada 5 minutos (cron)"
echo ""
echo "📋 Logs disponibles:"
echo "   • Servidor: /tmp/whatsapp-server-start.log"
echo "   • Bot: /tmp/whatsapp-rules-start.log"
echo "   • Monitoreo: /tmp/whatsapp-monitor.log"
#!/bin/bash

# Script de monitoreo y reinicio automático para servicios WhatsApp
# Ejecutar cada 5 minutos con cron: */5 * * * * /home/ubuntu/whatsapp-server/monitor-services.sh

LOG_FILE="/tmp/whatsapp-monitor.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "=== Monitoreo WhatsApp - $TIMESTAMP ===" >> $LOG_FILE

# Función para verificar si un servicio está corriendo
check_service() {
    local service_name=$1
    local process_pattern=$2
    
    if pgrep -f "$process_pattern" > /dev/null; then
        echo "✅ $service_name está corriendo" >> $LOG_FILE
        return 0
    else
        echo "❌ $service_name NO está corriendo" >> $LOG_FILE
        return 1
    fi
}

# Función para iniciar un servicio
start_service() {
    local service_name=$1
    local start_command=$2
    
    echo "🚀 Iniciando $service_name..." >> $LOG_FILE
    eval "$start_command" >> $LOG_FILE 2>&1
    
    # Esperar un momento
    sleep 5
    
    if check_service "$service_name" "$3"; then
        echo "✅ $service_name iniciado exitosamente" >> $LOG_FILE
        return 0
    else
        echo "❌ Error iniciando $service_name" >> $LOG_FILE
        return 1
    fi
}

# Verificar servidor WhatsApp
if ! check_service "Servidor WhatsApp" "server-robust.js"; then
    echo "🔄 Reiniciando servidor WhatsApp..." >> $LOG_FILE
    pkill -f "server-robust.js" 2>/dev/null
    sleep 2
    start_service "Servidor WhatsApp" \
        "cd /home/ubuntu/whatsapp-server && nohup node server-robust.js > /tmp/whatsapp-server-monitor.log 2>&1 &" \
        "server-robust.js"
fi

# Verificar bot de reglas
if ! check_service "Bot de Reglas" "whatsapp-rules-eroika-especial-fixed.js"; then
    echo "🔄 Reiniciando bot de reglas..." >> $LOG_FILE
    pkill -f "whatsapp-rules-eroika-especial-fixed.js" 2>/dev/null
    sleep 2
    start_service "Bot de Reglas" \
        "cd /home/ubuntu/whatsapp-server && nohup node whatsapp-rules-eroika-especial-fixed.js > /tmp/whatsapp-rules-monitor.log 2>&1 &" \
        "whatsapp-rules-eroika-especial-fixed.js"
fi

# Verificar conexión HTTP
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/status)
if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Servidor HTTP responde correctamente (HTTP $HTTP_STATUS)" >> $LOG_FILE
else
    echo "❌ Servidor HTTP NO responde (HTTP $HTTP_STATUS)" >> $LOG_FILE
    echo "🔄 Reiniciando servidor..." >> $LOG_FILE
    pkill -f "server-robust.js" 2>/dev/null
    sleep 2
    start_service "Servidor WhatsApp" \
        "cd /home/ubuntu/whatsapp-server && nohup node server-robust.js > /tmp/whatsapp-server-monitor.log 2>&1 &" \
        "server-robust.js"
fi

# Verificar estado WhatsApp
WHATSAPP_STATUS=$(curl -s http://localhost:8080/status | jq -r '.whatsappConnected // "false"' 2>/dev/null)
if [ "$WHATSAPP_STATUS" = "true" ]; then
    echo "✅ WhatsApp conectado" >> $LOG_FILE
else
    echo "⚠️ WhatsApp NO conectado" >> $LOG_FILE
    # No reiniciamos automáticamente, el servidor maneja la reconexión
fi

echo "=== Fin monitoreo ===" >> $LOG_FILE
echo "" >> $LOG_FILE

# Mantener solo las últimas 1000 líneas del log
tail -1000 $LOG_FILE > $LOG_FILE.tmp && mv $LOG_FILE.tmp $LOG_FILE
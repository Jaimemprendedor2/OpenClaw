#!/bin/bash
# WhatsApp Connect - Start Script (v2.0.0)
# Sistema completo con servidor robusto, bot de reglas y monitoreo
# Autor: Donna 🦞

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir con color
print_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Función para mostrar ayuda
show_help() {
    echo "WhatsApp Connect v2.0.0 - Sistema completo"
    echo ""
    echo "Uso: $0 [comando]"
    echo ""
    echo "Comandos disponibles:"
    echo "  start           Iniciar todos los servicios (servidor + bot + tunnel)"
    echo "  stop            Detener todos los servicios"
    echo "  restart         Reiniciar todos los servicios"
    echo "  status          Ver estado de todos los servicios"
    echo "  server-only     Iniciar solo el servidor WhatsApp"
    echo "  rules-only      Iniciar solo el bot de reglas"
    echo "  tunnel-only     Iniciar solo el tunnel público"
    echo "  monitor-only    Ejecutar monitoreo una vez"
    echo "  logs            Ver logs de todos los servicios"
    echo "  clean           Limpiar sesión (forzar nuevo QR)"
    echo "  help            Mostrar esta ayuda"
    echo ""
    echo "Configuración automática:"
    echo "  setup-cron      Configurar monitoreo automático (cron)"
    echo ""
    echo "Ejemplos:"
    echo "  $0 start        # Iniciar sistema completo"
    echo "  $0 status       # Verificar estado"
    echo "  $0 logs         # Ver logs en tiempo real"
}

# Función para verificar si un servicio está corriendo
is_service_running() {
    local service_name=$1
    local process_pattern=$2
    
    if pgrep -f "$process_pattern" > /dev/null; then
        return 0  # Está corriendo
    else
        return 1  # No está corriendo
    fi
}

# Función para mostrar estado
show_status() {
    echo ""
    print_color $BLUE "📊 ESTADO DEL SISTEMA WHATSAPP CONNECT"
    echo "=========================================="
    
    # Servidor WhatsApp
    if is_service_running "Servidor WhatsApp" "server-robust.js"; then
        print_color $GREEN "✅ Servidor WhatsApp: CORRIENDO"
        
        # Verificar estado HTTP
        if curl -s http://localhost:8080/status > /dev/null 2>&1; then
            local status_data=$(curl -s http://localhost:8080/status)
            local connected=$(echo "$status_data" | grep -o '"whatsappConnected":[^,]*' | cut -d: -f2)
            local hasQR=$(echo "$status_data" | grep -o '"hasQR":[^,]*' | cut -d: -f2)
            
            if [ "$connected" = "true" ]; then
                print_color $GREEN "   • WhatsApp: CONECTADO"
            else
                if [ "$hasQR" = "true" ]; then
                    print_color $YELLOW "   • WhatsApp: NECESITA QR (hasQR: true)"
                else
                    print_color $YELLOW "   • WhatsApp: DESCONECTADO"
                fi
            fi
        else
            print_color $RED "   • Estado HTTP: NO RESPONDE"
        fi
    else
        print_color $RED "❌ Servidor WhatsApp: DETENIDO"
    fi
    
    # Bot de reglas
    if is_service_running "Bot de Reglas" "whatsapp-rules-eroika-especial-fixed.js"; then
        print_color $GREEN "✅ Bot de Reglas: CORRIENDO"
    else
        print_color $RED "❌ Bot de Reglas: DETENIDO"
    fi
    
    # Tunnel público
    if is_service_running "Tunnel público" "lt --port"; then
        print_color $GREEN "✅ Tunnel público: CORRIENDO"
        # Obtener URL del tunnel
        if [ -f /tmp/localtunnel.log ]; then
            local url=$(grep -i "your url" /tmp/localtunnel.log | tail -1 | awk '{print $NF}')
            if [ -n "$url" ]; then
                print_color $BLUE "   • URL: $url"
            fi
        fi
    else
        print_color $RED "❌ Tunnel público: DETENIDO"
    fi
    
    # Monitoreo cron
    if crontab -l 2>/dev/null | grep -q "monitor-services.sh"; then
        print_color $GREEN "✅ Monitoreo automático: CONFIGURADO (cron)"
    else
        print_color $YELLOW "⚠️  Monitoreo automático: NO CONFIGURADO"
    fi
    
    echo ""
    print_color $BLUE "📋 LOGS DISPONIBLES:"
    echo "   • Servidor: /tmp/whatsapp-server-updated.log"
    echo "   • Bot reglas: /tmp/whatsapp-rules-restart.log"
    echo "   • Tunnel: /tmp/localtunnel.log"
    echo "   • Monitoreo: /tmp/whatsapp-monitor.log"
    echo ""
}

# Función para iniciar todos los servicios
start_all() {
    print_color $BLUE "🚀 Iniciando sistema completo WhatsApp Connect..."
    
    # Verificar si ya está corriendo el servidor
    if is_service_running "Servidor WhatsApp" "server-robust.js"; then
        print_color $YELLOW "⚠️  Servidor WhatsApp ya está corriendo"
    else
        print_color $GREEN "🔧 Iniciando servidor WhatsApp..."
        cd "$(dirname "$0")"
        nohup node server-robust.js > /tmp/whatsapp-server-updated.log 2>&1 &
        sleep 5
        
        if is_service_running "Servidor WhatsApp" "server-robust.js"; then
            print_color $GREEN "✅ Servidor WhatsApp iniciado"
        else
            print_color $RED "❌ Error iniciando servidor WhatsApp"
            return 1
        fi
    fi
    
    # Verificar si ya está corriendo el bot de reglas
    if is_service_running "Bot de Reglas" "whatsapp-rules-eroika-especial-fixed.js"; then
        print_color $YELLOW "⚠️  Bot de Reglas ya está corriendo"
    else
        print_color $GREEN "🤖 Iniciando bot de reglas..."
        cd "$(dirname "$0")"
        nohup node whatsapp-rules-eroika-especial-fixed.js > /tmp/whatsapp-rules-restart.log 2>&1 &
        sleep 3
        
        if is_service_running "Bot de Reglas" "whatsapp-rules-eroika-especial-fixed.js"; then
            print_color $GREEN "✅ Bot de Reglas iniciado"
        else
            print_color $RED "❌ Error iniciando bot de reglas"
            return 1
        fi
    fi
    
    # Tunnel (opcional, ya que se genera automáticamente cuando se necesita)
    print_color $BLUE "🌐 Tunnel público: Se generará automáticamente cuando se requiera QR"
    
    show_status
    print_color $GREEN "🎉 Sistema iniciado exitosamente!"
    
    # Mostrar instrucciones
    echo ""
    print_color $YELLOW "📋 INSTRUCCIONES:"
    echo "   1. Verificar estado: $0 status"
    echo "   2. Ver logs: $0 logs"
    echo "   3. Si necesita QR: Acceder a la URL pública que se generará automáticamente"
    echo ""
}

# Función para detener todos los servicios
stop_all() {
    print_color $RED "🛑 Deteniendo todos los servicios..."
    
    # Detener servidor WhatsApp
    if is_service_running "Servidor WhatsApp" "server-robust.js"; then
        pkill -f "server-robust.js"
        sleep 2
        print_color $GREEN "✅ Servidor WhatsApp detenido"
    fi
    
    # Detener bot de reglas
    if is_service_running "Bot de Reglas" "whatsapp-rules-eroika-especial-fixed.js"; then
        pkill -f "whatsapp-rules-eroika-especial-fixed.js"
        sleep 2
        print_color $GREEN "✅ Bot de Reglas detenido"
    fi
    
    # Detener tunnel
    if is_service_running "Tunnel público" "lt --port"; then
        pkill -f "lt --port"
        sleep 2
        print_color $GREEN "✅ Tunnel público detenido"
    fi
    
    print_color $GREEN "🎯 Todos los servicios detenidos"
}

# Función para limpiar sesión
clean_session() {
    print_color $YELLOW "🧹 Limpiando sesión WhatsApp (forzar nuevo QR)..."
    
    # Detener servicios primero
    stop_all
    
    # Eliminar directorio de autenticación
    if [ -d "./.wwebjs_auth" ]; then
        rm -rf "./.wwebjs_auth"
        print_color $GREEN "✅ Sesión eliminada"
    else
        print_color $YELLOW "⚠️  No se encontró sesión existente"
    fi
    
    # Eliminar archivo de solicitudes (opcional)
    if [ -f "./solicitudes-jaime.json" ]; then
        # Podemos mantenerlo o resetearlo
        print_color $BLUE "📋 Archivo de solicitudes mantenido"
    fi
    
    print_color $GREEN "✅ Sesión limpiada. Al iniciar se requerirá nuevo QR."
}

# Función para configurar cron
setup_cron() {
    print_color $BLUE "⏰ Configurando monitoreo automático (cron)..."
    
    local script_path="$(cd "$(dirname "$0")" && pwd)/monitor-services.sh"
    
    if [ ! -f "$script_path" ]; then
        print_color $RED "❌ No se encuentra monitor-services.sh"
        return 1
    fi
    
    # Verificar si ya está configurado
    if crontab -l 2>/dev/null | grep -q "monitor-services.sh"; then
        print_color $YELLOW "⚠️  Monitoreo ya está configurado en cron"
    else
        (crontab -l 2>/dev/null; echo "*/5 * * * * $script_path") | crontab -
        if [ $? -eq 0 ]; then
            print_color $GREEN "✅ Monitoreo configurado (cada 5 minutos)"
        else
            print_color $RED "❌ Error configurando cron"
            return 1
        fi
    fi
    
    # Mostrar configuración actual
    echo ""
    print_color $BLUE "📋 CONFIGURACIÓN CRON ACTUAL:"
    crontab -l 2>/dev/null | grep -E "(monitor|whatsapp)" || echo "No hay entradas relacionadas"
}

# Función para ver logs
show_logs() {
    print_color $BLUE "📄 Mostrando logs de servicios..."
    
    echo ""
    print_color $YELLOW "=== SERVICIO: SERVIDOR WHATSAPP ==="
    if [ -f "/tmp/whatsapp-server-updated.log" ]; then
        tail -20 "/tmp/whatsapp-server-updated.log"
    else
        echo "No hay logs del servidor"
    fi
    
    echo ""
    print_color $YELLOW "=== SERVICIO: BOT DE REGLAS ==="
    if [ -f "/tmp/whatsapp-rules-restart.log" ]; then
        tail -20 "/tmp/whatsapp-rules-restart.log"
    else
        echo "No hay logs del bot de reglas"
    fi
    
    echo ""
    print_color $YELLOW "=== SERVICIO: TUNNEL PÚBLICO ==="
    if [ -f "/tmp/localtunnel.log" ]; then
        tail -10 "/tmp/localtunnel.log"
    else
        echo "No hay logs del tunnel"
    fi
    
    echo ""
    print_color $YELLOW "=== SERVICIO: MONITOREO ==="
    if [ -f "/tmp/whatsapp-monitor.log" ]; then
        tail -10 "/tmp/whatsapp-monitor.log"
    else
        echo "No hay logs de monitoreo"
    fi
}

# Manejo de comandos
case "$1" in
    start)
        start_all
        ;;
    stop)
        stop_all
        ;;
    restart)
        print_color $BLUE "🔄 Reiniciando todos los servicios..."
        stop_all
        sleep 3
        start_all
        ;;
    status)
        show_status
        ;;
    server-only)
        print_color $BLUE "🔧 Iniciando solo servidor WhatsApp..."
        cd "$(dirname "$0")"
        node server-robust.js
        ;;
    rules-only)
        print_color $BLUE "🤖 Iniciando solo bot de reglas..."
        cd "$(dirname "$0")"
        node whatsapp-rules-eroika-especial-fixed.js
        ;;
    tunnel-only)
        print_color $BLUE "🌐 Iniciando solo tunnel público..."
        print_color $YELLOW "⚠️  Nota: El servidor debe estar corriendo en puerto 8080"
        lt --port 8080 --local-host 127.0.0.1
        ;;
    monitor-only)
        print_color $BLUE "📊 Ejecutando monitoreo una vez..."
        ./monitor-services.sh
        ;;
    logs)
        show_logs
        ;;
    clean)
        clean_session
        ;;
    setup-cron)
        setup_cron
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        # Si no hay comando, mostrar ayuda y estado
        echo ""
        print_color $YELLOW "WhatsApp Connect v2.0.0 - Sistema completo"
        echo "─────────────────────────────────────"
        show_help | head -10
        echo ""
        show_status
        ;;
esac

exit 0
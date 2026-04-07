#!/bin/bash
# WhatsApp Connect - Start Script
# Versión: 1.0.0
# Autor: Donna 🦞

set -e

CONFIG_FILE="config/whatsapp-config.json"
LOG_DIR="/tmp"
SERVER_LOG="$LOG_DIR/whatsapp-server.log"
TUNNEL_LOG="$LOG_DIR/whatsapp-tunnel.log"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

check_config() {
    if [ ! -f "$CONFIG_FILE" ]; then
        error "Archivo de configuración no encontrado: $CONFIG_FILE"
        log "Copia el ejemplo: cp config/whatsapp-config.json.example $CONFIG_FILE"
        log "Edita con tu token de Telegram y chat ID"
        exit 1
    fi
    
    # Verificar que tenga token de Telegram
    if ! grep -q '"botToken"' "$CONFIG_FILE" || grep -q '"botToken": ""' "$CONFIG_FILE"; then
        warning "Token de Telegram no configurado en $CONFIG_FILE"
        log "Las notificaciones Telegram no funcionarán sin token"
    fi
    
    success "Configuración verificada"
}

check_dependencies() {
    log "Verificando dependencias..."
    
    # Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js no encontrado. Instala Node.js v18+"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        error "Node.js v18+ requerido. Tienes v$(node -v)"
        exit 1
    fi
    
    # npm
    if ! command -v npm &> /dev/null; then
        error "npm no encontrado"
        exit 1
    fi
    
    # Chromium/Chrome
    CHROMIUM_PATHS=(
        "/usr/bin/chromium-browser"
        "/usr/bin/chromium"
        "/usr/bin/google-chrome"
        "$(which chromium-browser 2>/dev/null)"
        "$(which chromium 2>/dev/null)"
        "$(which google-chrome 2>/dev/null)"
    )
    
    CHROMIUM_FOUND=false
    for path in "${CHROMIUM_PATHS[@]}"; do
        if [ -f "$path" ]; then
            log "Chromium encontrado: $path"
            CHROMIUM_FOUND=true
            break
        fi
    done
    
    if [ "$CHROMIUM_FOUND" = false ]; then
        warning "Chromium/Chrome no encontrado. whatsapp-web.js puede fallar."
        log "Instala: sudo apt install chromium-browser"
    fi
    
    success "Dependencias verificadas"
}

install_deps() {
    log "Instalando/actualizando dependencias..."
    npm install
    success "Dependencias instaladas"
}

start_server() {
    log "Iniciando servidor WhatsApp..."
    
    # Matar procesos anteriores
    pkill -f "node server-enhanced.js" 2>/dev/null || true
    sleep 2
    
    # Iniciar nuevo proceso
    nohup node server-enhanced.js > "$SERVER_LOG" 2>&1 &
    SERVER_PID=$!
    
    # Esperar que inicie
    sleep 5
    
    # Verificar que esté corriendo
    if ps -p $SERVER_PID > /dev/null; then
        success "Servidor iniciado (PID: $SERVER_PID)"
        log "Logs: $SERVER_LOG"
        
        # Verificar health endpoint
        if curl -s http://localhost:8080/health > /dev/null 2>&1; then
            success "Servidor respondiendo en http://localhost:8080"
        else
            warning "Servidor iniciado pero no responde. Revisa logs."
        fi
    else
        error "Error iniciando servidor. Revisa: $SERVER_LOG"
        exit 1
    fi
}

start_tunnel() {
    log "Iniciando tunnel público..."
    
    # Matar tunnel anterior
    pkill -f "node tunnel.js" 2>/dev/null || true
    sleep 2
    
    # Iniciar nuevo tunnel
    nohup node tunnel.js > "$TUNNEL_LOG" 2>&1 &
    TUNNEL_PID=$!
    
    sleep 3
    
    if ps -p $TUNNEL_PID > /dev/null; then
        success "Tunnel iniciado (PID: $TUNNEL_PID)"
        log "Logs: $TUNNEL_LOG"
        
        # Extraer URL del log
        if grep -q "Tunnel creado:" "$TUNNEL_LOG" 2>/dev/null; then
            TUNNEL_URL=$(grep "Tunnel creado:" "$TUNNEL_LOG" | cut -d' ' -f3)
            success "Tunnel público: $TUNNEL_URL"
        fi
    else
        warning "Error iniciando tunnel. Revisa: $TUNNEL_LOG"
        warning "Puedes iniciar manualmente: npm run tunnel"
    fi
}

stop_all() {
    log "Deteniendo todos los procesos..."
    
    pkill -f "node server-enhanced.js" 2>/dev/null && success "Servidor detenido" || warning "Servidor no estaba corriendo"
    pkill -f "node tunnel.js" 2>/dev/null && success "Tunnel detenido" || warning "Tunnel no estaba corriendo"
    
    sleep 2
}

show_status() {
    echo ""
    echo "📊 ${BLUE}Estado del sistema:${NC}"
    echo ""
    
    # Servidor
    if pgrep -f "node server-enhanced.js" > /dev/null; then
        echo "  ${GREEN}✅ Servidor WhatsApp:${NC} Corriendo"
        echo "     URL local: http://localhost:8080"
        echo "     Logs: $SERVER_LOG"
        
        # Health check
        HEALTH=$(curl -s http://localhost:8080/health 2>/dev/null || echo "{}")
        WHATSAPP_STATUS=$(echo "$HEALTH" | grep -o '"whatsapp":[^,]*' | cut -d':' -f2)
        HAS_QR=$(echo "$HEALTH" | grep -o '"hasQR":[^,]*' | cut -d':' -f2)
        
        if [ "$WHATSAPP_STATUS" = "true" ]; then
            echo "     ${GREEN}WhatsApp: Conectado${NC}"
        elif [ "$HAS_QR" = "true" ]; then
            echo "     ${YELLOW}WhatsApp: Esperando QR${NC}"
        else
            echo "     ${RED}WhatsApp: Desconectado${NC}"
        fi
    else
        echo "  ${RED}❌ Servidor WhatsApp:${NC} Detenido"
    fi
    
    echo ""
    
    # Tunnel
    if pgrep -f "node tunnel.js" > /dev/null; then
        echo "  ${GREEN}✅ Tunnel público:${NC} Corriendo"
        echo "     Logs: $TUNNEL_LOG"
        
        # Extraer URL
        if [ -f "$TUNNEL_LOG" ]; then
            TUNNEL_URL=$(grep "Tunnel creado:" "$TUNNEL_LOG" 2>/dev/null | tail -1 | cut -d' ' -f3)
            if [ -n "$TUNNEL_URL" ]; then
                echo "     URL: $TUNNEL_URL"
            fi
        fi
    else
        echo "  ${RED}❌ Tunnel público:${NC} Detenido"
    fi
    
    echo ""
    echo "🔄 Para reiniciar: ./start.sh restart"
    echo "🛑 Para detener: ./start.sh stop"
    echo ""
}

case "${1:-start}" in
    start)
        log "🚀 Iniciando WhatsApp Connect..."
        check_config
        check_dependencies
        install_deps
        start_server
        start_tunnel
        show_status
        ;;
    
    stop)
        log "🛑 Deteniendo WhatsApp Connect..."
        stop_all
        success "Todos los procesos detenidos"
        ;;
    
    restart)
        log "🔄 Reiniciando WhatsApp Connect..."
        stop_all
        sleep 3
        check_config
        start_server
        start_tunnel
        show_status
        ;;
    
    status)
        show_status
        ;;
    
    logs)
        echo "📋 ${BLUE}Últimas líneas de logs:${NC}"
        echo ""
        echo "${GREEN}Servidor ($SERVER_LOG):${NC}"
        tail -20 "$SERVER_LOG" 2>/dev/null || echo "  Log no encontrado"
        echo ""
        echo "${GREEN}Tunnel ($TUNNEL_LOG):${NC}"
        tail -10 "$TUNNEL_LOG" 2>/dev/null || echo "  Log no encontrado"
        ;;
    
    config)
        echo "⚙️  ${BLUE}Configuración actual:${NC}"
        if [ -f "$CONFIG_FILE" ]; then
            cat "$CONFIG_FILE" | python3 -m json.tool 2>/dev/null || cat "$CONFIG_FILE"
        else
            error "Archivo de configuración no encontrado"
        fi
        ;;
    
    help|--help|-h)
        echo "📖 ${BLUE}WhatsApp Connect - Script de inicio${NC}"
        echo ""
        echo "Uso: ./start.sh [comando]"
        echo ""
        echo "Comandos:"
        echo "  start     - Iniciar servidor y tunnel (default)"
        echo "  stop      - Detener todos los procesos"
        echo "  restart   - Reiniciar todo"
        echo "  status    - Mostrar estado actual"
        echo "  logs      - Mostrar últimos logs"
        echo "  config    - Mostrar configuración"
        echo "  help      - Mostrar esta ayuda"
        echo ""
        echo "Ejemplos:"
        echo "  ./start.sh           # Iniciar todo"
        echo "  ./start.sh restart   # Reiniciar"
        echo "  ./start.sh status    # Ver estado"
        echo ""
        ;;
    
    *)
        error "Comando desconocido: $1"
        echo "Usa: ./start.sh help"
        exit 1
        ;;
esac
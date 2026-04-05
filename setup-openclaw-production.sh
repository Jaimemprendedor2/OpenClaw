#!/bin/bash

# setup-openclaw-production.sh
# Script para setup de OpenClaw en producción

echo "OpenClaw Production Setup"
echo "========================="
echo ""
echo "Este script configura OpenClaw para entorno de producción."
echo ""

# Verificar que estamos en Ubuntu/Debian
if [ ! -f /etc/os-release ]; then
    echo "Error: Sistema no soportado"
    exit 1
fi

# Instalar dependencias
echo "Instalando dependencias..."
sudo apt update
sudo apt install -y nodejs npm git curl wget

# Instalar OpenClaw globalmente
echo "Instalando OpenClaw..."
sudo npm install -g openclaw@latest

# Configurar servicio systemd
echo "Configurando servicio systemd..."
sudo openclaw onboard --install-daemon

# Crear estructura de directorios
echo "Creando estructura de directorios..."
mkdir -p ~/.openclaw/{backups,logs,sessions}

# Configuración inicial
echo "Configuración inicial completada."
echo ""
echo "Pasos manuales requeridos:"
echo "1. Configurar canales (Telegram, WhatsApp, etc.)"
echo "2. Configurar proveedores de modelos"
echo "3. Personalizar configuración en ~/.openclaw/openclaw.json"
echo ""
echo "Para iniciar el servicio:"
echo "  sudo systemctl start openclaw-gateway"
echo ""
echo "Para ver logs:"
echo "  sudo journalctl -u openclaw-gateway -f"
#!/bin/bash

# health-check.sh
# Verificación de integridad del agente Donna

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Health Check del Agente Donna 🦞 ===${NC}"
echo "Fecha: $(date)"
echo ""

ERRORS=0
WARNINGS=0

# Función para verificar archivo
check_file() {
    local file=$1
    local description=$2
    local critical=$3
    
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $description${NC}"
        echo "  Ruta: $file"
        echo "  Tamaño: $(wc -l < "$file") líneas"
    else
        if [ "$critical" = "critical" ]; then
            echo -e "${RED}❌ CRÍTICO: $description${NC}"
            echo "  Archivo faltante: $file"
            ERRORS=$((ERRORS + 1))
        else
            echo -e "${YELLOW}⚠️  ADVERTENCIA: $description${NC}"
            echo "  Archivo faltante: $file"
            WARNINGS=$((WARNINGS + 1))
        fi
    fi
}

# Función para verificar directorio
check_dir() {
    local dir=$1
    local description=$2
    
    if [ -d "$dir" ]; then
        echo -e "${GREEN}✅ $description${NC}"
        echo "  Ruta: $dir"
        echo "  Archivos: $(find "$dir" -type f | wc -l)"
    else
        echo -e "${YELLOW}⚠️  ADVERTENCIA: $description${NC}"
        echo "  Directorio faltante: $dir"
        WARNINGS=$((WARNINGS + 1))
    fi
}

# ========== VERIFICACIÓN DE ARCHIVOS CORE ==========
echo -e "${YELLOW}[1/5] Verificando archivos core...${NC}"

check_file "SOUL.md" "Personalidad del agente" "critical"
check_file "IDENTITY.md" "Identidad del agente" "critical"
check_file "AGENTS.md" "Reglas operativas" "critical"
check_file "USER.md" "Perfil del usuario" "critical"
check_file "SECURITY.md" "Estado de seguridad" "normal"
check_file "README.md" "Documentación del workspace" "normal"
check_file ".gitignore" "Exclusiones de git" "normal"

# ========== VERIFICACIÓN DE ESTRUCTURA ==========
echo -e "${YELLOW}[2/5] Verificando estructura...${NC}"

check_dir "memory" "Memoria del agente"
check_dir "docs" "Documentación"
check_dir "config" "Configuración"
check_dir "scripts" "Scripts de automatización"
check_dir "backups" "Backups"
check_dir "skills" "Skills instaladas"

# Verificar archivo de memoria del día
TODAY=$(date +%Y-%m-%d)
if [ -f "memory/$TODAY.md" ]; then
    echo -e "${GREEN}✅ Memoria del día actual${NC}"
    echo "  Archivo: memory/$TODAY.md"
else
    echo -e "${YELLOW}⚠️  Memoria del día no creada${NC}"
    echo "  Faltante: memory/$TODAY.md"
    WARNINGS=$((WARNINGS + 1))
fi

# ========== VERIFICACIÓN DE GIT ==========
echo -e "${YELLOW}[3/5] Verificando estado de git...${NC}"

if git status > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Repositorio git inicializado${NC}"
    
    # Verificar remoto
    if git remote -v | grep -q "origin"; then
        echo -e "${GREEN}✅ Remoto configurado${NC}"
        git remote -v | grep origin
    else
        echo -e "${YELLOW}⚠️  Sin remoto configurado${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
    
    # Verificar cambios sin commit
    if git diff --quiet && git diff --cached --quiet; then
        echo -e "${GREEN}✅ Sin cambios pendientes${NC}"
    else
        echo -e "${YELLOW}⚠️  Cambios sin commit${NC}"
        git status --short
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${RED}❌ No es un repositorio git${NC}"
    ERRORS=$((ERRORS + 1))
fi

# ========== VERIFICACIÓN DE SKILLS ==========
echo -e "${YELLOW}[4/5] Verificando skills...${NC}"

if [ -d "skills" ] && [ "$(ls -A skills 2>/dev/null)" ]; then
    echo -e "${GREEN}✅ Skills instaladas:${NC}"
    for skill in skills/*/; do
        skill_name=$(basename "$skill")
        if [ -f "$skill/SKILL.md" ]; then
            echo "  - $skill_name ✅"
        else
            echo "  - $skill_name ⚠️ (sin SKILL.md)"
            WARNINGS=$((WARNINGS + 1))
        fi
    done
else
    echo -e "${YELLOW}⚠️  Sin skills instaladas${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# ========== VERIFICACIÓN DE OPENCLAW ==========
echo -e "${YELLOW}[5/5] Verificando OpenClaw...${NC}"

if command -v openclaw > /dev/null 2>&1; then
    echo -e "${GREEN}✅ OpenClaw instalado${NC}"
    openclaw --version
else
    echo -e "${RED}❌ OpenClaw no encontrado${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Verificar gateway
if openclaw gateway status > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Gateway funcionando${NC}"
else
    echo -e "${YELLOW}⚠️  Gateway no funcionando o inaccesible${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# ========== RESUMEN ==========
echo ""
echo -e "${GREEN}=== RESUMEN ===${NC}"
echo "Errores críticos: $ERRORS"
echo "Advertencias: $WARNINGS"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ Estado perfecto${NC}"
    echo "El agente está en óptimas condiciones."
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Estado con advertencias${NC}"
    echo "Funcional pero con áreas de mejora."
    exit 0
else
    echo -e "${RED}❌ Estado con errores críticos${NC}"
    echo "Se requiere intervención."
    exit 1
fi
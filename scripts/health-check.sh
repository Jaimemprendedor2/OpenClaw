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

# ========== VERIFICACIÓN DE ESTRUCTURA ==========
echo -e "${YELLOW}[4/5] Verificando estructura y reglas...${NC}"

# Verificar estructura de directorios
echo -e "${YELLOW}Verificando estructura de directorios...${NC}"

EXPECTED_DIRS=(".github/workflows" "config" "docs" "memory" "scripts" "skills")
for dir in "${EXPECTED_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo -e "  ${GREEN}✅ Directorio $dir existe${NC}"
    else
        echo -e "  ${YELLOW}⚠️  Directorio $dir faltante${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
done

# Verificar archivos en lugares correctos
echo -e "${YELLOW}Verificando ubicación de archivos...${NC}"

# Archivos que NO deberían estar en root (excepto core)
ROOT_FILES=$(find . -maxdepth 1 -type f -name "*.md" -o -name "*.sh" -o -name "*.json" -o -name "*.gpg" | grep -v "^./.git" | grep -v "^./SOUL.md" | grep -v "^./AGENTS.md" | grep -v "^./IDENTITY.md" | grep -v "^./CHANGELOG.md" | grep -v "^./.gitignore" | sed 's|^./||')

if [ -n "$ROOT_FILES" ]; then
    echo -e "  ${YELLOW}⚠️  Archivos en root que deberían estar en subdirectorios:${NC}"
    for file in $ROOT_FILES; do
        echo "    - $file"
    done
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "  ${GREEN}✅ Root limpio (solo archivos core)${NC}"
fi

# Verificar .gitignore en config y root son iguales
if [ -f ".gitignore" ] && [ -f "config/.gitignore" ]; then
    if diff .gitignore config/.gitignore > /dev/null 2>&1; then
        echo -e "  ${GREEN}✅ .gitignore consistentes (root y config)${NC}"
    else
        echo -e "  ${YELLOW}⚠️  .gitignore diferentes entre root y config${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

# ========== VERIFICACIÓN DE SKILLS ==========
echo -e "${YELLOW}[5/6] Verificando skills...${NC}"

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

# ========== VERIFICACIÓN DE REGLAS ==========
echo -e "${YELLOW}[6/7] Verificando reglas de orden...${NC}"

# Verificar archivo de reglas existe
if [ -f "docs/REGLAS_ORDEN.md" ]; then
    echo -e "  ${GREEN}✅ docs/REGLAS_ORDEN.md existe${NC}"
    # Verificar fecha de última revisión
    if grep -q "Última revisión: 2026" "docs/REGLAS_ORDEN.md"; then
        echo -e "  ${GREEN}✅ Reglas actualizadas (2026)${NC}"
    else
        echo -e "  ${YELLOW}⚠️  Reglas pueden estar desactualizadas${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "  ${YELLOW}⚠️  docs/REGLAS_ORDEN.md faltante${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# Verificar CHANGELOG.md actualizado
if [ -f "CHANGELOG.md" ]; then
    if grep -q "\[1\.0\.0\] - 2026" "CHANGELOG.md"; then
        echo -e "  ${GREEN}✅ CHANGELOG.md actualizado${NC}"
    else
        echo -e "  ${YELLOW}⚠️  CHANGELOG.md puede necesitar actualización${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

# ========== VERIFICACIÓN DE OPENCLAW ==========
echo -e "${YELLOW}[7/7] Verificando OpenClaw...${NC}"

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
echo "Verificaciones completadas: 7/7"
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
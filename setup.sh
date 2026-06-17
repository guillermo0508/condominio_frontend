#!/bin/bash

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 SETUP FRONTEND - Condominio${NC}\n"

if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Este script debe ejecutarse en el directorio condominiofrontend${NC}"
    exit 1
fi

echo -e "${YELLOW}1️⃣  Instalando dependencias...${NC}"
npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Dependencias instaladas${NC}\n"
else
    echo -e "${RED}❌ Error instalando dependencias${NC}"
    exit 1
fi

echo -e "${YELLOW}2️⃣  Configurando .env...${NC}"
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo -e "${GREEN}✅ Archivo .env creado${NC}\n"
else
    echo -e "${GREEN}✅ Archivo .env ya existe${NC}\n"
fi

echo -e "${BLUE}════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ SETUP FRONTEND COMPLETADO!${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════${NC}\n"

echo -e "${YELLOW}📋 Para iniciar el servidor:${NC}"
echo -e "  ${GREEN}npm run dev${NC}"
echo ""
echo -e "${YELLOW}🌐 Frontend disponible en:${NC}"
echo "  http://localhost:5173"
echo ""
echo -e "${YELLOW}⚠️  Asegúrate de que:${NC}"
echo "  • El backend está ejecutándose en http://localhost:8000"
echo "  • El archivo .env tiene VITE_API_URL=http://localhost:8000/api"
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════${NC}\n"

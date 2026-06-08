#!/usr/bin/env bash
set -euo pipefail

# Gera o build do frontend (Vite) e copia para backend/static/dist
# Uso: ./scripts/build_frontend_and_copy.sh

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$ROOT/frontend/templates/frontend-react"
BACKEND_DIST_DIR="$ROOT/backend/static/dist"

if [ ! -d "$FRONTEND_DIR" ]; then
  echo "Diretório frontend não encontrado: $FRONTEND_DIR" >&2
  exit 1
fi

echo "Instalando dependências no frontend..."
cd "$FRONTEND_DIR"
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

echo "Construindo frontend..."
npm run build

if [ ! -d "$FRONTEND_DIR/dist" ]; then
  echo "Build não gerou o diretório dist" >&2
  exit 1
fi

echo "Copiando build para backend static dist..."
rm -rf "$BACKEND_DIST_DIR"
mkdir -p "$BACKEND_DIST_DIR"
cp -r "$FRONTEND_DIR/dist/." "$BACKEND_DIST_DIR/"

echo "Build copiado para $BACKEND_DIST_DIR"

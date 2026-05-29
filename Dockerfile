# ── Estágio 1: Build do frontend React ────────────────────────────────────────
FROM node:20-slim AS frontend-build

WORKDIR /frontend
COPY frontend/templates/frontend-react/package*.json ./
RUN npm ci
COPY frontend/templates/frontend-react/ ./
RUN npm run build
# O build fica em /frontend/dist

# ── Estágio 2: Backend Python ─────────────────────────────────────────────────
FROM python:3.11-slim

# Dependências do sistema para dlib + opencv headless
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential cmake \
    libopenblas-dev liblapack-dev \
    libx11-dev \
    python3-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instala dependências Python
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copia código do backend e frontend
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Copia o build do React para onde o Flask serve
COPY --from=frontend-build /frontend/dist ./frontend/static/dist

WORKDIR /app/backend

EXPOSE 5000

ENV PYTHONPATH=/app/backend

CMD ["python", "app.py"]

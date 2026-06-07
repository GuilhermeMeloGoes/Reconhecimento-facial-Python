FROM node:20-slim AS frontend-build

WORKDIR /frontend
COPY frontend/templates/frontend-react/package*.json ./
RUN npm ci
COPY frontend/templates/frontend-react/ ./
RUN npm run build

FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential cmake \
    libopenblas-dev liblapack-dev \
    libx11-dev \
    python3-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/
COPY frontend/ ./frontend/

COPY --from=frontend-build /frontend/dist ./frontend/static/dist

WORKDIR /app/backend

EXPOSE 5000

ENV PYTHONPATH=/app/backend

CMD ["python", "app.py"]

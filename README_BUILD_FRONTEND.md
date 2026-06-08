# Build do Frontend e empacotamento para apresentação

Este script gera o build do frontend (Vite) e copia o resultado para `backend/static/dist`, permitindo que o backend sirva o app estático via `serve_react`.

Requisitos locais:
- Node.js (>=16) e npm instalados
- Acesso ao repositório (clonado)

Comandos:

PowerShell (Windows):
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build_frontend_and_copy.ps1
```

Shell (Linux/macOS):
```bash
sh scripts/build_frontend_and_copy.sh
```

CI (GitHub Actions): o workflow `.github/workflows/build_frontend.yml` (opcional) gera o artifact `frontend-dist` que você pode baixar.

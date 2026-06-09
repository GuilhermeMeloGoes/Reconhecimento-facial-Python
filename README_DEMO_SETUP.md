# Script de preparação para demonstração

Este documento explica como rodar o script que cria contas de exemplo (admin, pai, aluno) e como acessar cada perfil.

Passos para executar o script

1. Ative o ambiente virtual do backend (recomendado):

PowerShell (Windows):
```powershell
cd backend
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
.\.venv\Scripts\Activate.ps1
cd ..
python scripts\demo_setup.py
```

Linux/macOS:
```bash
cd backend
source .venv/bin/activate
cd ..
python3 scripts/demo_setup.py
```

2. O script criará:
- Aluno: `Aluno Demo` — matrícula `A001` (ID retornado pelo script)
- Usuário admin: `admin@example.com` / `senhaAdmin123`
- Usuário pai: `pai@example.com` / `senhaPai123` vinculado ao aluno

3. Tokens de acesso (exemplos com `curl` + `jq`):

Obter token admin:
```bash
ADMIN_TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","senha":"senhaAdmin123"}' | jq -r .access_token)
```

Obter token pai:
```bash
PARENT_TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"pai@example.com","senha":"senhaPai123"}' | jq -r .access_token)
```

Endpoints úteis para teste

- Listar vínculos (admin): `GET /api/admin/parent-links`
- Criar vínculo (admin): `POST /api/admin/parent-links` (body: `{"usuario_id":X,"aluno_id":Y}`)
- Remover vínculo (admin): `DELETE /api/admin/parent-links`
- Listar filhos do pai: `GET /api/parent/me`
- Consultar presença do filho (pai): `GET /api/parent/children/<aluno_id>/attendance`
- Perfil aluno (aluno vinculado): `GET /api/aluno/meu-perfil` e `GET /api/aluno/minhas-presencas`

Responsabilidades — resumo para apresentação

- Admin:
  - Gerencia cadastro de alunos e usuários
  - Vincula pais aos alunos
  - Gera relatórios e exporta PDF/CSV
  - Acesso total aos endpoints administrativos

- Pai/Aluno:
  - Pais: visualizar lista de filhos vinculados e seus relatórios de presença
  - Alunos: visualizar seu próprio histórico de presença e baixar relatório individual
  - Ambos têm acesso restrito apenas aos dados vinculados

Observações
- Se o backend não estiver rodando, o script ainda criará registros diretamente no banco (usa `backend` modules). Garanta que `DATABASE_URL` esteja configurada no ambiente.
- Para apresentação local, rode o frontend em modo dev (`npm run dev`) ou gere o build e copie para `backend/static/dist` (veja `README_BUILD_FRONTEND.md`).

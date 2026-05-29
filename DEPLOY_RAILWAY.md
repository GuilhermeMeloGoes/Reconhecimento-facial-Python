# FacePresença — Deploy no Railway

## O que foi corrigido

### Problema principal: câmera do servidor
O Railway (nuvem) não tem câmera física. A solução adotada:
- **Cadastro**: já usava câmera do celular ✓
- **Reconhecimento**: reescrito para usar câmera do celular via `getUserMedia`
  - Captura frames com `<canvas>` a cada 1.2s
  - Envia em base64 para `/api/reconhecer_frame`
  - Backend processa com `face_recognition` e registra entrada/saída
  - Exibe modal de confirmação quando reconhece

### Nova rota adicionada
`POST /api/reconhecer_frame`
```json
{
  "imagem_b64": "<frame JPEG em base64>",
  "tipo": "entrada" | "saida" | null
}
```

---

## Deploy no Railway

### 1. Banco de dados persistente (OBRIGATÓRIO)

O SQLite **some a cada deploy**. Configure um banco PostgreSQL ou MySQL:

**Opção A — PostgreSQL no Railway (gratuito):**
1. No painel do Railway, clique em **New** → **Database** → **PostgreSQL**
2. O Railway gera a variável `DATABASE_URL` automaticamente no formato:
   `postgresql://user:password@host:port/database`

> ⚠️ O código atual suporta apenas MySQL. Para usar PostgreSQL, instale `psycopg2-binary`
> no requirements.txt e adapte `db.py`. Alternativamente, use um MySQL externo:

**Opção B — MySQL externo (PlanetScale, Railway MySQL, etc.):**
1. Crie um banco MySQL
2. Configure no Railway: **Variables** → adicionar:
   ```
   DATABASE_URL=mysql://usuario:senha@host:3306/nome_banco
   ```

### 2. Variáveis de ambiente no Railway

Vá em **Variables** do seu serviço e adicione:

| Variável | Valor | Obrigatório |
|---|---|---|
| `DATABASE_URL` | `mysql://user:pass@host:3306/db` | Sim (produção) |
| `SECRET_KEY` | string aleatória longa | Recomendado |

### 3. Deploy

```bash
# Suba o código para o GitHub e conecte ao Railway
# OU use Railway CLI:
railway up
```

---

## Uso no celular

1. Acesse `https://seu-projeto.up.railway.app`
2. **Cadastrar aluno**: Menu → Cadastrar → preencha o formulário → ative câmera → tire foto
3. **Registrar presença**: Menu → Reconhecimento → clique em ENTRADA ou SAÍDA → aponte a câmera para o rosto

### Permissão de câmera
O navegador vai pedir permissão de câmera na primeira vez. É necessário:
- Aceitar a permissão
- O site precisa estar em HTTPS (Railway fornece automaticamente)

---

## Estrutura do projeto

```
projeto/
├── backend/
│   ├── app.py              ← API Flask (MODIFICADO)
│   ├── config.py
│   ├── requirements.txt
│   ├── face/
│   │   ├── capture.py      ← Processar imagem base64 (MODIFICADO)
│   │   └── recognizer.py   ← Identificar rostos (MODIFICADO)
│   ├── attendance/
│   │   └── manager.py      ← Registrar entrada/saída
│   └── database/
│       └── db.py           ← SQLite + MySQL
├── frontend/
│   └── templates/frontend-react/
│       └── src/
│           ├── pages/
│           │   ├── Reconhecimento.jsx  ← Câmera do celular (REESCRITO)
│           │   ├── Cadastrar.jsx       ← Já usava câmera celular ✓
│           │   ├── Dashboard.jsx
│           │   ├── Alunos.jsx
│           │   └── Relatorio.jsx
│           └── components/
│               └── Layout.jsx          ← Menu mobile (MODIFICADO)
├── Dockerfile
└── railway.json
```

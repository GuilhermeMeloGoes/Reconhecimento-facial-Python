#!/usr/bin/env python3
"""
Script de configuração de demonstração.

Cria no banco:
- um aluno de exemplo
- um usuário admin (admin@example.com / senhaAdmin123)
- um usuário pai (pai@example.com / senhaPai123) vinculado ao aluno

Execute com o interpreter do venv do backend:
  cd backend
  .venv\Scripts\Activate.ps1 (Windows) or source .venv/bin/activate (Linux)
  python ..\scripts\demo_setup.py

"""
import os
import sys
from pprint import pprint

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
BACKEND_PATH = os.path.join(ROOT, 'backend')
sys.path.insert(0, BACKEND_PATH)

try:
    from database import db
    from auth import models as auth_models
    from database import parent_links as parent_links_db
except Exception as e:
    print('Erro importando módulos do backend. Execute este script usando o Python do venv do backend.')
    print(e)
    sys.exit(1)

def main():
    print('Conectando ao banco...')
    conn = db.get_conn()

    try:
        print('Criando tabelas (se necessário)...')
        db.criar_tabelas(conn)

        print('Criando aluno de exemplo...')
        aluno_id = db.salvar_aluno(conn, 'Aluno Demo', 'A001', '1A', embedding=[])
        print('Aluno criado id=', aluno_id)

        print('Criando usuário admin (admin@example.com / senhaAdmin123)')
        admin_id = auth_models.criar_usuario(conn, 'Admin Demo', 'admin@example.com', 'senhaAdmin123', perfil='admin', aluno_id=None)
        print('Admin id=', admin_id)

        print('Criando usuário pai (pai@example.com / senhaPai123)')
        pai_id = auth_models.criar_usuario(conn, 'Pai Demo', 'pai@example.com', 'senhaPai123', perfil='aluno', aluno_id=None)
        print('Pai id=', pai_id)

        print('Vinculando pai -> aluno...')
        parent_links_db.adicionar_vinculo(conn, pai_id, aluno_id)

        print('\nResumo:')
        pprint({
            'aluno_id': aluno_id,
            'admin_user': {'id': admin_id, 'email': 'admin@example.com', 'senha': 'senhaAdmin123'},
            'pai_user': {'id': pai_id, 'email': 'pai@example.com', 'senha': 'senhaPai123'},
        })

        print('\nExemplos de login (curl):')
        print('Admin token:')
        print('curl -s -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"admin@example.com\",\"senha\":\"senhaAdmin123\"}" | jq -r .access_token')
        print('\nPai token:')
        print('curl -s -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"pai@example.com\",\"senha\":\"senhaPai123\"}" | jq -r .access_token')

    finally:
        try:
            conn.close()
        except Exception:
            pass

if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""
CLI para gerenciar o sistema FacePresença.
Uso:
    python manage.py create_admin --email admin@escola.com --senha 123456 --nome "Administrador"
"""
import sys
import os
import argparse

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from database import db
from auth.models import criar_usuario, buscar_por_email, contar_admins


def create_admin(args):
    conn = db.get_conn()
    db.criar_tabelas(conn)

    existente = buscar_por_email(conn, args.email.lower())
    if existente:
        print(f"❌ Já existe um usuário com email '{args.email}'")
        conn.close()
        sys.exit(1)

    uid = criar_usuario(
        conn,
        nome=args.nome,
        email=args.email.lower(),
        senha=args.senha,
        perfil="admin",
        aluno_id=None,
    )
    conn.close()

    print(f"✅ Admin criado com sucesso!")
    print(f"   ID:    {uid}")
    print(f"   Nome:  {args.nome}")
    print(f"   Email: {args.email}")
    print(f"   Perfil: admin")


def main():
    parser = argparse.ArgumentParser(description="FacePresença CLI")
    subparsers = parser.add_subparsers(dest="command")

    # create_admin
    admin_parser = subparsers.add_parser("create_admin", help="Criar primeiro admin")
    admin_parser.add_argument("--email", required=True, help="Email do admin")
    admin_parser.add_argument("--senha", required=True, help="Senha do admin")
    admin_parser.add_argument("--nome", default="Administrador", help="Nome do admin")

    args = parser.parse_args()

    if args.command == "create_admin":
        create_admin(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()

import os
import sqlite3
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from config import DB_PATH, DATABASE_URL
from database import db


def migrate(sqlite_path):
    if not DATABASE_URL or not DATABASE_URL.startswith("mysql://"):
        raise RuntimeError("Defina DATABASE_URL apontando para MySQL antes de migrar.")

    if not os.path.exists(sqlite_path):
        raise FileNotFoundError(f"Arquivo SQLite não encontrado: {sqlite_path}")

    sqlite_conn = sqlite3.connect(sqlite_path)
    sqlite_conn.row_factory = sqlite3.Row

    mysql_conn = db.get_conn()
    if not db.is_mysql(mysql_conn):
        raise RuntimeError("A conexão ativa não está usando MySQL.")

    db.criar_tabelas(mysql_conn)

    alunos = sqlite_conn.execute(
        "SELECT id, nome, matricula, turma, embedding, foto_path, cadastrado_em FROM alunos ORDER BY id"
    ).fetchall()
    registros = sqlite_conn.execute(
        "SELECT id, aluno_id, tipo, timestamp, enviado_tb FROM registros ORDER BY id"
    ).fetchall()

    ph = mysql_conn.placeholder
    mysql_conn.execute("SET FOREIGN_KEY_CHECKS = 0")
    mysql_conn.execute("DELETE FROM registros")
    mysql_conn.execute("DELETE FROM alunos")
    mysql_conn.execute("SET FOREIGN_KEY_CHECKS = 1")

    for a in alunos:
        mysql_conn.execute(
            f"""
            INSERT INTO alunos (id, nome, matricula, turma, embedding, foto_path, cadastrado_em)
            VALUES ({ph}, {ph}, {ph}, {ph}, {ph}, {ph}, {ph})
            """,
            (a["id"], a["nome"], a["matricula"], a["turma"], a["embedding"], a["foto_path"], a["cadastrado_em"]),
        )

    for r in registros:
        mysql_conn.execute(
            f"""
            INSERT INTO registros (id, aluno_id, tipo, timestamp, enviado_tb)
            VALUES ({ph}, {ph}, {ph}, {ph}, {ph})
            """,
            (r["id"], r["aluno_id"], r["tipo"], r["timestamp"], r["enviado_tb"]),
        )

    next_aluno_id = (alunos[-1]["id"] + 1) if alunos else 1
    next_registro_id = (registros[-1]["id"] + 1) if registros else 1
    mysql_conn.execute(f"ALTER TABLE alunos AUTO_INCREMENT = {next_aluno_id}")
    mysql_conn.execute(f"ALTER TABLE registros AUTO_INCREMENT = {next_registro_id}")

    mysql_conn.commit()
    sqlite_conn.close()
    mysql_conn.close()

    print(f"Migração concluída: {len(alunos)} alunos e {len(registros)} registros.")


if __name__ == "__main__":
    migrate(DB_PATH)

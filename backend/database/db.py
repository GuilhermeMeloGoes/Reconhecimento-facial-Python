import sqlite3
import pickle
import os
import numpy as np
from config import DB_PATH


def get_conn():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def criar_tabelas(conn):
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS alunos (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            nome         TEXT    NOT NULL,
            matricula    TEXT    UNIQUE NOT NULL,
            turma        TEXT,
            embedding    BLOB    NOT NULL,
            foto_path    TEXT,
            cadastrado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS registros (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            aluno_id   INTEGER NOT NULL,
            tipo       TEXT    CHECK(tipo IN ('entrada','saida')) NOT NULL,
            timestamp  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            enviado_tb INTEGER DEFAULT 0,
            FOREIGN KEY(aluno_id) REFERENCES alunos(id)
        );

        CREATE INDEX IF NOT EXISTS idx_registros_aluno
            ON registros(aluno_id, timestamp DESC);
    """)
    conn.commit()

def salvar_aluno(conn, nome, matricula, turma, embedding, foto_path=None):
    blob = pickle.dumps(embedding)
    cursor = conn.execute(
        "INSERT INTO alunos (nome, matricula, turma, embedding, foto_path) VALUES (?,?,?,?,?)",
        (nome, matricula, turma, blob, foto_path)
    )
    conn.commit()
    return cursor.lastrowid


def carregar_alunos(conn):
    rows = conn.execute("SELECT id, nome, matricula, turma, embedding FROM alunos").fetchall()
    return [(r["id"], r["nome"], r["matricula"], r["turma"], pickle.loads(r["embedding"])) for r in rows]


def buscar_aluno_por_id(conn, aluno_id):
    return conn.execute("SELECT * FROM alunos WHERE id=?", (aluno_id,)).fetchone()


def listar_alunos(conn):
    return conn.execute(
        "SELECT id, nome, matricula, turma, cadastrado_em FROM alunos ORDER BY nome"
    ).fetchall()


def deletar_aluno(conn, aluno_id):
    conn.execute("DELETE FROM registros WHERE aluno_id=?", (aluno_id,))
    conn.execute("DELETE FROM alunos WHERE id=?", (aluno_id,))
    conn.commit()

def registrar_evento(conn, aluno_id, tipo):
    cursor = conn.execute(
        "INSERT INTO registros (aluno_id, tipo) VALUES (?,?)",
        (aluno_id, tipo)
    )
    conn.commit()
    return cursor.lastrowid


def ultimo_registro(conn, aluno_id):
    return conn.execute(
        "SELECT tipo, timestamp FROM registros WHERE aluno_id=? ORDER BY timestamp DESC LIMIT 1",
        (aluno_id,)
    ).fetchone()


def registros_do_dia(conn, data=None):
    if data is None:
        data = "date('now','localtime')"
        sql = f"""
            SELECT r.id, a.nome, a.matricula, a.turma, r.tipo, r.timestamp
            FROM registros r JOIN alunos a ON a.id = r.aluno_id
            WHERE date(r.timestamp) = {data}
            ORDER BY r.timestamp DESC
        """
        return conn.execute(sql).fetchall()
    else:
        return conn.execute("""
            SELECT r.id, a.nome, a.matricula, a.turma, r.tipo, r.timestamp
            FROM registros r JOIN alunos a ON a.id = r.aluno_id
            WHERE date(r.timestamp) = ?
            ORDER BY r.timestamp DESC
        """, (data,)).fetchall()


def registros_nao_enviados(conn):
    return conn.execute("""
        SELECT r.id, a.nome, a.matricula, a.turma, r.tipo, r.timestamp
        FROM registros r JOIN alunos a ON a.id = r.aluno_id
        WHERE r.enviado_tb = 0
    """).fetchall()


def marcar_enviado(conn, registro_id):
    conn.execute("UPDATE registros SET enviado_tb=1 WHERE id=?", (registro_id,))
    conn.commit()


def resumo_presenca(conn, data=None):
    if data is None:
        filtro = "date(r.timestamp) = date('now','localtime')"
        params = ()
    else:
        filtro = "date(r.timestamp) = ?"
        params = (data,)

    presentes = conn.execute(f"""
        SELECT COUNT(DISTINCT aluno_id) FROM registros r WHERE {filtro}
    """, params).fetchone()[0]

    total = conn.execute("SELECT COUNT(*) FROM alunos").fetchone()[0]
    return {"presentes": presentes, "ausentes": total - presentes, "total": total}

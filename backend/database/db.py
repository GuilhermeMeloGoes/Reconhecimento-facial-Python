import sqlite3
import pickle
import os
import numpy as np
from urllib.parse import urlparse, unquote
from config import DB_PATH, DATABASE_URL

try:
    import pymysql
    from pymysql.cursors import DictCursor
except Exception:
    pymysql = None
    DictCursor = None


class DBConnection:
    def __init__(self, raw_conn, backend):
        self._raw = raw_conn
        self.backend = backend
        self.placeholder = "%s" if backend == "mysql" else "?"

    @property
    def is_mysql(self):
        return self.backend == "mysql"

    def execute(self, sql, params=()):
        if self.is_mysql:
            cursor = self._raw.cursor()
            cursor.execute(sql, params or ())
            return cursor
        return self._raw.execute(sql, params or ())

    def executescript(self, sql_script):
        if self.is_mysql:
            parts = [stmt.strip() for stmt in sql_script.split(";") if stmt.strip()]
            with self._raw.cursor() as cursor:
                for stmt in parts:
                    cursor.execute(stmt)
        else:
            self._raw.executescript(sql_script)

    def commit(self):
        self._raw.commit()

    def close(self):
        self._raw.close()


def is_mysql(conn):
    return getattr(conn, "is_mysql", False)


def _as_bytes(value):
    if isinstance(value, memoryview):
        return value.tobytes()
    if isinstance(value, bytearray):
        return bytes(value)
    return value


def get_conn():
    if DATABASE_URL:
        if not DATABASE_URL.startswith("mysql://"):
            raise RuntimeError("DATABASE_URL inválida para MySQL. Exemplo: mysql://usuario:senha@host:3306/banco")
        if pymysql is None:
            raise RuntimeError("pymysql não está instalado. Rode: pip install pymysql")

        parsed = urlparse(DATABASE_URL)
        database = parsed.path.lstrip("/")
        if not database:
            raise RuntimeError("DATABASE_URL inválida: nome do banco não informado.")

        raw_conn = pymysql.connect(
            host=parsed.hostname or "localhost",
            port=parsed.port or 3306,
            user=unquote(parsed.username or ""),
            password=unquote(parsed.password or ""),
            database=database,
            charset="utf8mb4",
            autocommit=False,
            cursorclass=DictCursor
        )
        return DBConnection(raw_conn, "mysql")

    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    raw_conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    raw_conn.row_factory = sqlite3.Row
    return DBConnection(raw_conn, "sqlite")


def criar_tabelas(conn):
    if is_mysql(conn):
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS alunos (
                id            INT AUTO_INCREMENT PRIMARY KEY,
                nome          VARCHAR(255) NOT NULL,
                matricula     VARCHAR(100) UNIQUE NOT NULL,
                turma         VARCHAR(100),
                embedding     LONGBLOB NOT NULL,
                foto_path     TEXT,
                cadastrado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS registros (
                id         INT AUTO_INCREMENT PRIMARY KEY,
                aluno_id   INT NOT NULL,
                tipo       ENUM('entrada','saida') NOT NULL,
                timestamp  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                enviado_tb TINYINT(1) DEFAULT 0,
                KEY idx_registros_aluno (aluno_id, timestamp),
                CONSTRAINT fk_registros_aluno FOREIGN KEY (aluno_id) REFERENCES alunos(id)
            );
        """)
    else:
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
                timestamp  TIMESTAMP DEFAULT (datetime('now', 'localtime')),
                enviado_tb INTEGER DEFAULT 0,
                FOREIGN KEY(aluno_id) REFERENCES alunos(id)
            );

            CREATE INDEX IF NOT EXISTS idx_registros_aluno
                ON registros(aluno_id, timestamp DESC);
        """)
    conn.commit()

def salvar_aluno(conn, nome, matricula, turma, embedding, foto_path=None):
    blob = pickle.dumps(embedding)
    ph = conn.placeholder
    cursor = conn.execute(
        f"INSERT INTO alunos (nome, matricula, turma, embedding, foto_path) VALUES ({ph},{ph},{ph},{ph},{ph})",
        (nome, matricula, turma, blob, foto_path)
    )
    conn.commit()
    return cursor.lastrowid


def carregar_alunos(conn):
    rows = conn.execute("SELECT id, nome, matricula, turma, embedding FROM alunos").fetchall()
    return [(r["id"], r["nome"], r["matricula"], r["turma"], pickle.loads(_as_bytes(r["embedding"]))) for r in rows]


def buscar_aluno_por_id(conn, aluno_id):
    return conn.execute(f"SELECT * FROM alunos WHERE id={conn.placeholder}", (aluno_id,)).fetchone()


def listar_alunos(conn):
    return conn.execute(
        "SELECT id, nome, matricula, turma, cadastrado_em FROM alunos ORDER BY nome"
    ).fetchall()


def deletar_aluno(conn, aluno_id):
    ph = conn.placeholder
    conn.execute(f"DELETE FROM registros WHERE aluno_id={ph}", (aluno_id,))
    conn.execute(f"DELETE FROM alunos WHERE id={ph}", (aluno_id,))
    conn.commit()


def atualizar_aluno(conn, aluno_id, nome, turma):
    ph = conn.placeholder
    conn.execute(
        f"UPDATE alunos SET nome={ph}, turma={ph} WHERE id={ph}",
        (nome, turma, aluno_id)
    )
    conn.commit()


def registrar_evento(conn, aluno_id, tipo):
    ph = conn.placeholder
    timestamp_expr = "CURRENT_TIMESTAMP" if is_mysql(conn) else "datetime('now', 'localtime')"
    cursor = conn.execute(
        f"INSERT INTO registros (aluno_id, tipo, timestamp) VALUES ({ph},{ph}, {timestamp_expr})",
        (aluno_id, tipo)
    )
    conn.commit()
    return cursor.lastrowid


def ultimo_registro(conn, aluno_id):
    return conn.execute(
        f"SELECT tipo, timestamp FROM registros WHERE aluno_id={conn.placeholder} ORDER BY timestamp DESC LIMIT 1",
        (aluno_id,)
    ).fetchone()


def registros_do_dia(conn, data=None):
    ph = conn.placeholder
    hoje_expr = "CURRENT_DATE()" if is_mysql(conn) else "date('now','localtime')"
    if data is None:
        sql = f"""
            SELECT r.id, a.nome, a.matricula, a.turma, r.tipo, r.timestamp
            FROM registros r JOIN alunos a ON a.id = r.aluno_id
            WHERE date(r.timestamp) = {hoje_expr}
            ORDER BY r.timestamp DESC
        """
        return conn.execute(sql).fetchall()
    else:
        return conn.execute(f"""
            SELECT r.id, a.nome, a.matricula, a.turma, r.tipo, r.timestamp
            FROM registros r JOIN alunos a ON a.id = r.aluno_id
            WHERE date(r.timestamp) = {ph}
            ORDER BY r.timestamp DESC
        """, (data,)).fetchall()


def registros_nao_enviados(conn):
    return conn.execute("""
        SELECT r.id, a.nome, a.matricula, a.turma, r.tipo, r.timestamp
        FROM registros r JOIN alunos a ON a.id = r.aluno_id
        WHERE r.enviado_tb = 0
    """).fetchall()


def marcar_enviado(conn, registro_id):
    conn.execute(f"UPDATE registros SET enviado_tb=1 WHERE id={conn.placeholder}", (registro_id,))
    conn.commit()


def resumo_presenca(conn, data=None):
    ph = conn.placeholder
    hoje_expr = "CURRENT_DATE()" if is_mysql(conn) else "date('now','localtime')"
    if data is None:
        filtro = f"date(r.timestamp) = {hoje_expr}"
        params = ()
    else:
        filtro = f"date(r.timestamp) = {ph}"
        params = (data,)

    presentes = conn.execute(f"""
        SELECT COUNT(DISTINCT aluno_id) as total_presentes FROM registros r WHERE {filtro}
    """, params).fetchone()["total_presentes"]

    total = conn.execute("SELECT COUNT(*) as total_alunos FROM alunos").fetchone()["total_alunos"]
    return {"presentes": presentes, "ausentes": total - presentes, "total": total}

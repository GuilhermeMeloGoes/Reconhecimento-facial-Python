import pickle
import os
import threading
import logging
from urllib.parse import urlparse, unquote
from config import DATABASE_URL

logger = logging.getLogger(__name__)

try:
    import pymysql
    from pymysql.cursors import DictCursor
    from pymysql.err import OperationalError as MySQLOperationalError
except Exception:
    pymysql = None
    DictCursor = None
    MySQLOperationalError = Exception


# ── Lock global para acesso thread-safe ao pool de conexões ───────────────────
_conn_lock = threading.Lock()


def _parse_mysql_url(url: str) -> dict:
    """Parseia DATABASE_URL nos formatos mysql:// e mysql+pymysql://"""
    # Normaliza prefixo para urllib entender
    normalized = url.replace("mysql+pymysql://", "mysql://", 1)
    parsed = urlparse(normalized)
    database = parsed.path.lstrip("/")
    if not database:
        raise RuntimeError(
            "DATABASE_URL inválida: nome do banco não informado. "
            "Exemplo: mysql://user:senha@host:3306/nome_banco"
        )
    return {
        "host":     parsed.hostname or "localhost",
        "port":     parsed.port or 3306,
        "user":     unquote(parsed.username or ""),
        "password": unquote(parsed.password or ""),
        "database": database,
    }


class DBConnection:
    """
    Wrapper de conexão MySQL com reconexão automática.
    Cada thread deve obter sua própria instância via get_conn().
    """

    def __init__(self, params: dict):
        self._params = params
        self._raw = None
        self.placeholder = "%s"
        self._connect()

    def _connect(self):
        if pymysql is None:
            raise RuntimeError(
                "pymysql não está instalado. "
                "Adicione 'pymysql>=1.1' ao requirements.txt"
            )
        self._raw = pymysql.connect(
            host=self._params["host"],
            port=self._params["port"],
            user=self._params["user"],
            password=self._params["password"],
            database=self._params["database"],
            charset="utf8mb4",
            autocommit=False,
            cursorclass=DictCursor,
            connect_timeout=10,
        )
        logger.info("MySQL: conexão estabelecida com %s/%s",
                    self._params["host"], self._params["database"])

    def _ensure_connected(self):
        """Reconecta automaticamente se a conexão caiu (Railway reinicia containers)."""
        try:
            self._raw.ping(reconnect=True)
        except Exception:
            logger.warning("MySQL: conexão perdida, reconectando...")
            self._connect()

    @property
    def is_mysql(self):
        return True

    def execute(self, sql, params=()):
        self._ensure_connected()
        cursor = self._raw.cursor()
        cursor.execute(sql, params or ())
        return cursor

    def executescript(self, sql_script):
        self._ensure_connected()
        parts = [s.strip() for s in sql_script.split(";") if s.strip()]
        with self._raw.cursor() as cursor:
            for stmt in parts:
                cursor.execute(stmt)

    def fetchall(self, sql, params=()):
        return self.execute(sql, params).fetchall()

    def fetchone(self, sql, params=()):
        return self.execute(sql, params).fetchone()

    def commit(self):
        self._raw.commit()

    def rollback(self):
        try:
            self._raw.rollback()
        except Exception:
            pass

    def close(self):
        try:
            self._raw.close()
        except Exception:
            pass


# ── Singleton de parâmetros de conexão (parseados uma vez) ───────────────────
_mysql_params: dict | None = None

def _get_mysql_params() -> dict:
    global _mysql_params
    if _mysql_params is None:
        if not DATABASE_URL:
            raise RuntimeError(
                "Variável de ambiente DATABASE_URL não configurada. "
                "No Railway: vá em Variables e adicione "
                "DATABASE_URL=mysql://usuario:senha@host:3306/banco"
            )
        url = DATABASE_URL.strip()
        if not (url.startswith("mysql://") or url.startswith("mysql+pymysql://")):
            raise RuntimeError(
                f"DATABASE_URL com protocolo não suportado: '{url[:30]}...'\n"
                "Use o formato: mysql://usuario:senha@host:3306/nome_banco"
            )
        _mysql_params = _parse_mysql_url(url)
    return _mysql_params


def get_conn() -> DBConnection:
    """
    Retorna uma nova conexão MySQL.
    Chame get_conn() a cada request (não reutilize entre threads).
    """
    params = _get_mysql_params()
    return DBConnection(params)


# ── Helpers internos ──────────────────────────────────────────────────────────

def is_mysql(conn) -> bool:
    return getattr(conn, "is_mysql", False)


def _as_bytes(value):
    if isinstance(value, memoryview):
        return value.tobytes()
    if isinstance(value, bytearray):
        return bytes(value)
    return value


# ── DDL ───────────────────────────────────────────────────────────────────────

def criar_tabelas(conn: DBConnection):
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS alunos (
            id            INT AUTO_INCREMENT PRIMARY KEY,
            nome          VARCHAR(255)  NOT NULL,
            matricula     VARCHAR(100)  UNIQUE NOT NULL,
            turma         VARCHAR(100),
            embedding     LONGBLOB      NOT NULL,
            foto_path     TEXT,
            cadastrado_em TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS registros (
            id         INT AUTO_INCREMENT PRIMARY KEY,
            aluno_id   INT  NOT NULL,
            tipo       ENUM('entrada','saida') NOT NULL,
            timestamp  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            enviado_tb TINYINT(1) DEFAULT 0,
            KEY idx_registros_aluno (aluno_id, timestamp),
            CONSTRAINT fk_registros_aluno
                FOREIGN KEY (aluno_id) REFERENCES alunos(id)
                ON DELETE CASCADE
        )
    """)
    conn.commit()
    logger.info("MySQL: tabelas verificadas/criadas com sucesso.")


# ── CRUD de alunos ────────────────────────────────────────────────────────────

def salvar_aluno(conn: DBConnection, nome, matricula, turma, embedding, foto_path=None):
    blob = pickle.dumps(embedding)
    cursor = conn.execute(
        "INSERT INTO alunos (nome, matricula, turma, embedding, foto_path) "
        "VALUES (%s, %s, %s, %s, %s)",
        (nome, matricula, turma, blob, foto_path),
    )
    conn.commit()
    return cursor.lastrowid


def carregar_alunos(conn: DBConnection):
    rows = conn.fetchall(
        "SELECT id, nome, matricula, turma, embedding FROM alunos"
    )
    return [
        (
            r["id"],
            r["nome"],
            r["matricula"],
            r["turma"],
            pickle.loads(_as_bytes(r["embedding"])),
        )
        for r in rows
    ]


def buscar_aluno_por_id(conn: DBConnection, aluno_id):
    return conn.fetchone(
        "SELECT * FROM alunos WHERE id = %s", (aluno_id,)
    )


def listar_alunos(conn: DBConnection):
    return conn.fetchall(
        "SELECT id, nome, matricula, turma, cadastrado_em "
        "FROM alunos ORDER BY nome"
    )


def deletar_aluno(conn: DBConnection, aluno_id):
    # ON DELETE CASCADE cuida dos registros filhos automaticamente
    conn.execute("DELETE FROM alunos WHERE id = %s", (aluno_id,))
    conn.commit()


def atualizar_aluno(conn: DBConnection, aluno_id, nome, turma):
    conn.execute(
        "UPDATE alunos SET nome = %s, turma = %s WHERE id = %s",
        (nome, turma, aluno_id),
    )
    conn.commit()


# ── Registros de presença ─────────────────────────────────────────────────────

def registrar_evento(conn: DBConnection, aluno_id, tipo):
    cursor = conn.execute(
        "INSERT INTO registros (aluno_id, tipo) VALUES (%s, %s)",
        (aluno_id, tipo),
    )
    conn.commit()
    return cursor.lastrowid


def ultimo_registro(conn: DBConnection, aluno_id):
    return conn.fetchone(
        "SELECT tipo, timestamp FROM registros "
        "WHERE aluno_id = %s ORDER BY timestamp DESC LIMIT 1",
        (aluno_id,),
    )


def registros_do_dia(conn: DBConnection, data=None):
    base_sql = """
        SELECT r.id, a.nome, a.matricula, a.turma, r.tipo, r.timestamp
        FROM registros r
        JOIN alunos a ON a.id = r.aluno_id
        WHERE DATE(r.timestamp) = {filtro}
        ORDER BY r.timestamp DESC
    """
    if data is None:
        return conn.fetchall(
            base_sql.format(filtro="CURRENT_DATE()")
        )
    return conn.fetchall(
        base_sql.format(filtro="%s"), (data,)
    )


def registros_nao_enviados(conn: DBConnection):
    return conn.fetchall("""
        SELECT r.id, a.nome, a.matricula, a.turma, r.tipo, r.timestamp
        FROM registros r
        JOIN alunos a ON a.id = r.aluno_id
        WHERE r.enviado_tb = 0
    """)


def marcar_enviado(conn: DBConnection, registro_id):
    conn.execute(
        "UPDATE registros SET enviado_tb = 1 WHERE id = %s", (registro_id,)
    )
    conn.commit()


# ── Relatórios ────────────────────────────────────────────────────────────────

def resumo_presenca(conn: DBConnection, data=None):
    if data is None:
        filtro_sql = "DATE(r.timestamp) = CURRENT_DATE()"
        params = ()
    else:
        filtro_sql = "DATE(r.timestamp) = %s"
        params = (data,)

    presentes = conn.fetchone(
        f"SELECT COUNT(DISTINCT aluno_id) AS total_presentes "
        f"FROM registros r WHERE {filtro_sql}",
        params,
    )["total_presentes"]

    total = conn.fetchone(
        "SELECT COUNT(*) AS total_alunos FROM alunos"
    )["total_alunos"]

    return {
        "presentes": presentes,
        "ausentes":  total - presentes,
        "total":     total,
    }
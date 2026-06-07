"""
Funções de acesso ao banco para a tabela `usuarios`.
Senhas são armazenadas como hash bcrypt via werkzeug.
"""
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime


# ── Tabelas ──────────────────────────────────────────────────────────────

CRIAR_TABELA_USUARIOS = """
CREATE TABLE IF NOT EXISTS usuarios (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    nome        VARCHAR(255)  NOT NULL,
    email       VARCHAR(255)  UNIQUE NOT NULL,
    senha_hash  VARCHAR(255)  NOT NULL,
    perfil      ENUM('admin','aluno') NOT NULL DEFAULT 'aluno',
    aluno_id    INT           DEFAULT NULL,
    ativo       TINYINT(1)    DEFAULT 1,
    criado_em   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_usuario_aluno
        FOREIGN KEY (aluno_id) REFERENCES alunos(id)
        ON DELETE SET NULL
)
"""

CRIAR_TABELA_TOKENS_BLACKLIST = """
CREATE TABLE IF NOT EXISTS tokens_blacklist (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    jti        VARCHAR(255) UNIQUE NOT NULL,
    criado_em  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
"""


# ── CRUD de usuários ─────────────────────────────────────────────────────

def criar_usuario(conn, nome, email, senha, perfil="aluno", aluno_id=None):
    """Cria um novo usuário. Retorna o id."""
    senha_hash = generate_password_hash(senha)
    cursor = conn.execute(
        "INSERT INTO usuarios (nome, email, senha_hash, perfil, aluno_id) "
        "VALUES (%s, %s, %s, %s, %s)",
        (nome, email, senha_hash, perfil, aluno_id),
    )
    conn.commit()
    return cursor.lastrowid


def buscar_por_email(conn, email):
    """Retorna o dict do usuário ou None."""
    return conn.fetchone(
        "SELECT id, nome, email, senha_hash, perfil, aluno_id, ativo "
        "FROM usuarios WHERE email = %s",
        (email,),
    )


def verificar_senha(usuario_row, senha):
    """Compara senha em texto com o hash armazenado."""
    if not usuario_row:
        return False
    return check_password_hash(usuario_row["senha_hash"], senha)


def buscar_por_id(conn, usuario_id):
    return conn.fetchone(
        "SELECT id, nome, email, perfil, aluno_id, ativo, criado_em "
        "FROM usuarios WHERE id = %s",
        (usuario_id,),
    )


def listar_usuarios(conn):
    return conn.fetchall(
        "SELECT u.id, u.nome, u.email, u.perfil, u.aluno_id, u.ativo, u.criado_em, "
        "       a.nome AS aluno_nome, a.matricula AS aluno_matricula "
        "FROM usuarios u "
        "LEFT JOIN alunos a ON a.id = u.aluno_id "
        "ORDER BY u.criado_em DESC"
    )


def atualizar_usuario(conn, usuario_id, nome, perfil, aluno_id=None):
    conn.execute(
        "UPDATE usuarios SET nome = %s, perfil = %s, aluno_id = %s WHERE id = %s",
        (nome, perfil, aluno_id, usuario_id),
    )
    conn.commit()


def alterar_senha(conn, usuario_id, nova_senha):
    senha_hash = generate_password_hash(nova_senha)
    conn.execute(
        "UPDATE usuarios SET senha_hash = %s WHERE id = %s",
        (senha_hash, usuario_id),
    )
    conn.commit()


def toggle_ativo(conn, usuario_id, ativo):
    conn.execute(
        "UPDATE usuarios SET ativo = %s WHERE id = %s",
        (1 if ativo else 0, usuario_id),
    )
    conn.commit()


def deletar_usuario(conn, usuario_id):
    conn.execute("DELETE FROM usuarios WHERE id = %s", (usuario_id,))
    conn.commit()


def contar_admins(conn):
    row = conn.fetchone("SELECT COUNT(*) AS total FROM usuarios WHERE perfil = 'admin'")
    return row["total"] if row else 0


# ── Token blacklist ──────────────────────────────────────────────────────

def blacklist_token(conn, jti):
    conn.execute(
        "INSERT IGNORE INTO tokens_blacklist (jti) VALUES (%s)", (jti,)
    )
    conn.commit()


def is_token_blacklisted(conn, jti):
    row = conn.fetchone(
        "SELECT id FROM tokens_blacklist WHERE jti = %s", (jti,)
    )
    return row is not None

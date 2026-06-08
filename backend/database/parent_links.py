"""Operações para gerenciar vínculos entre usuários (pais) e alunos.
"""
from typing import List

def adicionar_vinculo(conn, usuario_id: int, aluno_id: int):
    conn.execute(
        "INSERT IGNORE INTO parent_links (usuario_id, aluno_id) VALUES (%s, %s)",
        (usuario_id, aluno_id),
    )
    conn.commit()

def remover_vinculo(conn, usuario_id: int, aluno_id: int):
    conn.execute(
        "DELETE FROM parent_links WHERE usuario_id = %s AND aluno_id = %s",
        (usuario_id, aluno_id),
    )
    conn.commit()

def listar_filhos(conn, usuario_id: int) -> List[dict]:
    """Retorna lista de alunos (linhas da tabela alunos) vinculados ao usuário."""
    return conn.fetchall(
        "SELECT a.id, a.nome, a.matricula, a.turma FROM parent_links p "
        "JOIN alunos a ON a.id = p.aluno_id WHERE p.usuario_id = %s",
        (usuario_id,),
    )

def existe_vinculo(conn, usuario_id: int, aluno_id: int) -> bool:
    row = conn.fetchone(
        "SELECT id FROM parent_links WHERE usuario_id = %s AND aluno_id = %s",
        (usuario_id, aluno_id),
    )
    return row is not None

def listar_todos(conn):
    """Retorna todos os vínculos com informações do usuário e do aluno."""
    return conn.fetchall(
        "SELECT p.id, p.usuario_id, u.nome AS usuario_nome, p.aluno_id, a.nome AS aluno_nome, a.matricula, a.turma "
        "FROM parent_links p "
        "JOIN usuarios u ON u.id = p.usuario_id "
        "JOIN alunos a ON a.id = p.aluno_id "
        "ORDER BY p.criado_em DESC"
    )


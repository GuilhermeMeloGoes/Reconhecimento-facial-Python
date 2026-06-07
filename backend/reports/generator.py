"""
Gerador de relatórios avançados — consultas SQL para relatórios
por período, turma, individual e ranking de frequência.
"""
from datetime import datetime, timedelta
from database import db


def relatorio_periodo(conn, data_inicio, data_fim, turma=None):
    """
    Relatório de presença por período. Retorna lista de dicts com
    dados de cada aluno: total_presencas, total_faltas, percentual.
    """
    ph = conn.placeholder

    turma_filter = ""
    params = [data_inicio, data_fim, data_inicio, data_fim]
    if turma:
        turma_filter = f" AND a.turma = {ph}"
        params.append(turma)

    sql = f"""
        SELECT
            a.id, a.nome, a.matricula, a.turma,
            COUNT(DISTINCT CASE WHEN r.tipo = 'entrada' THEN DATE(r.timestamp) END)
                AS dias_presente,
            (SELECT COUNT(DISTINCT d.dt) FROM (
                SELECT DATE(r2.timestamp) AS dt FROM registros r2
                WHERE DATE(r2.timestamp) BETWEEN {ph} AND {ph}
                GROUP BY DATE(r2.timestamp)
            ) d) AS total_dias_letivos
        FROM alunos a
        LEFT JOIN registros r ON r.aluno_id = a.id
            AND DATE(r.timestamp) BETWEEN {ph} AND {ph}
        WHERE 1=1 {turma_filter}
        GROUP BY a.id, a.nome, a.matricula, a.turma
        ORDER BY a.nome
    """

    rows = conn.fetchall(sql, tuple(params))
    resultado = []
    for r in rows:
        dias_presente = r["dias_presente"] or 0
        total_dias = r["total_dias_letivos"] or 1
        faltas = max(0, total_dias - dias_presente)
        percentual = round((dias_presente / total_dias) * 100, 1) if total_dias > 0 else 0

        resultado.append({
            "id":             r["id"],
            "nome":           r["nome"],
            "matricula":      r["matricula"],
            "turma":          r["turma"] or "—",
            "dias_presente":  dias_presente,
            "faltas":         faltas,
            "total_dias":     total_dias,
            "percentual":     percentual,
        })
    return resultado


def relatorio_individual(conn, aluno_id, data_inicio, data_fim):
    """Relatório individual de um aluno por período."""
    ph = conn.placeholder

    # Dados do aluno
    aluno = conn.fetchone(
        "SELECT id, nome, matricula, turma FROM alunos WHERE id = %s",
        (aluno_id,),
    )
    if not aluno:
        return None

    # Registros no período
    registros = conn.fetchall(
        f"SELECT r.tipo, r.timestamp FROM registros r "
        f"WHERE r.aluno_id = {ph} AND DATE(r.timestamp) BETWEEN {ph} AND {ph} "
        f"ORDER BY r.timestamp ASC",
        (aluno_id, data_inicio, data_fim),
    )

    # Dias com presença
    dias_presentes = conn.fetchone(
        f"SELECT COUNT(DISTINCT DATE(r.timestamp)) AS total "
        f"FROM registros r "
        f"WHERE r.aluno_id = {ph} AND r.tipo = 'entrada' "
        f"AND DATE(r.timestamp) BETWEEN {ph} AND {ph}",
        (aluno_id, data_inicio, data_fim),
    )

    # Total de dias letivos (dias em que houve QUALQUER registro)
    total_letivos = conn.fetchone(
        f"SELECT COUNT(DISTINCT DATE(r.timestamp)) AS total "
        f"FROM registros r "
        f"WHERE DATE(r.timestamp) BETWEEN {ph} AND {ph}",
        (data_inicio, data_fim),
    )

    presentes = dias_presentes["total"] if dias_presentes else 0
    total_dias = total_letivos["total"] if total_letivos else 1
    faltas = max(0, total_dias - presentes)
    percentual = round((presentes / total_dias) * 100, 1) if total_dias > 0 else 0

    return {
        "aluno":          dict(aluno),
        "registros":      [dict(r) for r in registros],
        "dias_presente":  presentes,
        "faltas":         faltas,
        "total_dias":     total_dias,
        "percentual":     percentual,
        "data_inicio":    data_inicio,
        "data_fim":       data_fim,
    }


def ranking_frequencia(conn, data_inicio, data_fim, limite=50):
    """Ranking de alunos por frequência (mais presentes primeiro)."""
    ph = conn.placeholder

    sql = f"""
        SELECT
            a.id, a.nome, a.matricula, a.turma,
            COUNT(DISTINCT CASE WHEN r.tipo = 'entrada' THEN DATE(r.timestamp) END)
                AS dias_presente
        FROM alunos a
        LEFT JOIN registros r ON r.aluno_id = a.id
            AND DATE(r.timestamp) BETWEEN {ph} AND {ph}
        GROUP BY a.id, a.nome, a.matricula, a.turma
        ORDER BY dias_presente DESC, a.nome ASC
        LIMIT {ph}
    """

    rows = conn.fetchall(sql, (data_inicio, data_fim, limite))

    # Total de dias letivos
    total_letivos = conn.fetchone(
        f"SELECT COUNT(DISTINCT DATE(r.timestamp)) AS total "
        f"FROM registros r WHERE DATE(r.timestamp) BETWEEN {ph} AND {ph}",
        (data_inicio, data_fim),
    )
    total_dias = total_letivos["total"] if total_letivos else 1

    resultado = []
    for i, r in enumerate(rows):
        dias = r["dias_presente"] or 0
        percentual = round((dias / total_dias) * 100, 1) if total_dias > 0 else 0
        resultado.append({
            "posicao":        i + 1,
            "id":             r["id"],
            "nome":           r["nome"],
            "matricula":      r["matricula"],
            "turma":          r["turma"] or "—",
            "dias_presente":  dias,
            "total_dias":     total_dias,
            "percentual":     percentual,
        })
    return resultado


def resumo_por_turma(conn, data=None):
    """Resumo de presença agrupado por turma."""
    if data:
        filtro = "%s"
        params = (data,)
    else:
        filtro = "CURRENT_DATE()"
        params = ()

    sql = f"""
        SELECT
            a.turma,
            COUNT(DISTINCT a.id) AS total_alunos,
            COUNT(DISTINCT CASE WHEN r.tipo = 'entrada' THEN a.id END) AS presentes
        FROM alunos a
        LEFT JOIN registros r ON r.aluno_id = a.id
            AND DATE(r.timestamp) = {filtro}
        GROUP BY a.turma
        ORDER BY a.turma
    """

    rows = conn.fetchall(sql, params)
    resultado = []
    for r in rows:
        total = r["total_alunos"] or 0
        presentes = r["presentes"] or 0
        ausentes = total - presentes
        percentual = round((presentes / total) * 100, 1) if total > 0 else 0
        resultado.append({
            "turma":      r["turma"] or "Sem turma",
            "total":      total,
            "presentes":  presentes,
            "ausentes":   ausentes,
            "percentual": percentual,
        })
    return resultado


def listar_turmas(conn):
    """Lista turmas únicas cadastradas."""
    rows = conn.fetchall(
        "SELECT DISTINCT turma FROM alunos WHERE turma IS NOT NULL AND turma != '' ORDER BY turma"
    )
    return [r["turma"] for r in rows]


def presencas_aluno_mes(conn, aluno_id, ano, mes):
    """
    Retorna os dias do mês em que o aluno esteve presente.
    Útil para o calendário visual do portal do aluno.
    """
    ph = conn.placeholder
    data_inicio = f"{ano}-{mes:02d}-01"

    if mes == 12:
        data_fim = f"{ano + 1}-01-01"
    else:
        data_fim = f"{ano}-{mes + 1:02d}-01"

    rows = conn.fetchall(
        f"SELECT DISTINCT DATE(r.timestamp) AS dia "
        f"FROM registros r "
        f"WHERE r.aluno_id = {ph} AND r.tipo = 'entrada' "
        f"AND DATE(r.timestamp) >= {ph} AND DATE(r.timestamp) < {ph} "
        f"ORDER BY dia",
        (aluno_id, data_inicio, data_fim),
    )

    return [str(r["dia"]) for r in rows]

"""
Exportador de relatórios em CSV.
"""
import io
import csv
from datetime import datetime


def gerar_csv_relatorio_dia(registros, faltas=None):
    """Gera CSV com registros do dia."""
    buffer = io.StringIO()
    writer = csv.writer(buffer)

    writer.writerow(["Horário", "Nome", "Matrícula", "Turma", "Tipo"])
    for r in registros:
        ts = str(r.get("timestamp", ""))
        if "T" in ts:
            hora = ts[11:16]
        elif len(ts) > 16:
            hora = ts[11:16]
        else:
            hora = ts
        writer.writerow([
            hora,
            r.get("nome", ""),
            r.get("matricula", ""),
            r.get("turma", "—"),
            r.get("tipo", ""),
        ])

    if faltas:
        writer.writerow([])
        writer.writerow(["--- FALTAS ---"])
        writer.writerow(["Nome", "Matrícula", "Turma", "Status"])
        for a in faltas:
            writer.writerow([
                a.get("nome", ""),
                a.get("matricula", ""),
                a.get("turma", "—"),
                "AUSENTE",
            ])

    buffer.seek(0)
    return buffer.getvalue()


def gerar_csv_relatorio_periodo(dados, data_inicio, data_fim):
    """Gera CSV com dados de frequência por período."""
    buffer = io.StringIO()
    writer = csv.writer(buffer)

    writer.writerow([f"Relatório de {data_inicio} a {data_fim}"])
    writer.writerow([])
    writer.writerow(["Nome", "Matrícula", "Turma", "Dias Presente", "Faltas", "Frequência (%)"])

    for d in dados:
        writer.writerow([
            d["nome"],
            d["matricula"],
            d["turma"],
            d["dias_presente"],
            d["faltas"],
            f"{d['percentual']}%",
        ])

    buffer.seek(0)
    return buffer.getvalue()


def gerar_csv_individual(dados):
    """Gera CSV individual de um aluno."""
    buffer = io.StringIO()
    writer = csv.writer(buffer)

    aluno = dados["aluno"]
    writer.writerow([f"Relatório Individual — {aluno['nome']}"])
    writer.writerow([f"Matrícula: {aluno['matricula']}"])
    writer.writerow([f"Turma: {aluno.get('turma', '—')}"])
    writer.writerow([f"Período: {dados['data_inicio']} a {dados['data_fim']}"])
    writer.writerow([])
    writer.writerow(["Dias Presente", "Faltas", "Total Dias Letivos", "Frequência (%)"])
    writer.writerow([
        dados["dias_presente"],
        dados["faltas"],
        dados["total_dias"],
        f"{dados['percentual']}%",
    ])
    writer.writerow([])
    writer.writerow(["Data", "Horário", "Tipo"])

    for r in dados["registros"]:
        ts = str(r.get("timestamp", ""))
        if "T" in ts:
            data_str = ts[:10]
            hora_str = ts[11:16]
        else:
            data_str = ts[:10]
            hora_str = ts[11:16] if len(ts) > 16 else ts
        writer.writerow([
            data_str,
            hora_str,
            r.get("tipo", ""),
        ])

    buffer.seek(0)
    return buffer.getvalue()

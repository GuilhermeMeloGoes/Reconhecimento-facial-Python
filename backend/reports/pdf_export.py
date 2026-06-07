"""
Exportador de relatórios em PDF usando reportlab.
Gera documentos estilizados com cabeçalho, tabelas e rodapé.
"""
import io
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph,
    Spacer, HRFlowable,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT


# ── Cores do tema ────────────────────────────────────────────────────────
COR_PRIMARIA   = colors.HexColor("#6C5CE7")
COR_HEADER_BG  = colors.HexColor("#1a1a2e")
COR_HEADER_FG  = colors.white
COR_ALT_ROW    = colors.HexColor("#f8f9fa")
COR_GRID       = colors.HexColor("#dee2e6")
COR_SUCESSO    = colors.HexColor("#00E5A0")
COR_PERIGO     = colors.HexColor("#FF4D6D")
COR_AVISO      = colors.HexColor("#FFB800")


def _get_styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name="TituloRelatorio",
        fontName="Helvetica-Bold",
        fontSize=18,
        textColor=COR_PRIMARIA,
        spaceAfter=4,
    ))
    styles.add(ParagraphStyle(
        name="Subtitulo",
        fontName="Helvetica",
        fontSize=10,
        textColor=colors.HexColor("#666666"),
        spaceAfter=16,
    ))
    styles.add(ParagraphStyle(
        name="SecaoTitulo",
        fontName="Helvetica-Bold",
        fontSize=13,
        textColor=COR_PRIMARIA,
        spaceBefore=16,
        spaceAfter=8,
    ))
    styles.add(ParagraphStyle(
        name="Rodape",
        fontName="Helvetica",
        fontSize=7,
        textColor=colors.HexColor("#999999"),
        alignment=TA_CENTER,
    ))
    return styles


def _cabecalho(styles, titulo, subtitulo=None):
    """Gera elementos do cabeçalho."""
    elementos = []
    elementos.append(Paragraph("FacePresença — Reconhecimento Facial", styles["TituloRelatorio"]))
    sub = subtitulo or f"Gerado em {datetime.now().strftime('%d/%m/%Y às %H:%M')}"
    elementos.append(Paragraph(sub, styles["Subtitulo"]))
    elementos.append(HRFlowable(
        width="100%", thickness=1, color=COR_PRIMARIA,
        spaceAfter=12, spaceBefore=4,
    ))
    if titulo:
        elementos.append(Paragraph(titulo, styles["SecaoTitulo"]))
    return elementos


def _rodape(styles):
    return [
        Spacer(1, 20),
        HRFlowable(width="100%", thickness=0.5, color=COR_GRID, spaceAfter=8),
        Paragraph(
            f"Relatório gerado automaticamente pelo sistema FacePresença · "
            f"{datetime.now().strftime('%d/%m/%Y %H:%M:%S')}",
            styles["Rodape"],
        ),
    ]


def _tabela_estilizada(dados, col_widths=None):
    """Cria uma tabela com estilo padrão."""
    t = Table(dados, colWidths=col_widths, repeatRows=1)
    estilo = [
        # Header
        ("BACKGROUND",    (0, 0), (-1, 0), COR_HEADER_BG),
        ("TEXTCOLOR",     (0, 0), (-1, 0), COR_HEADER_FG),
        ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, 0), 9),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
        ("TOPPADDING",    (0, 0), (-1, 0), 8),
        # Body
        ("FONTNAME",      (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE",      (0, 1), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 6),
        ("TOPPADDING",    (0, 1), (-1, -1), 6),
        # Grid
        ("GRID",          (0, 0), (-1, -1), 0.5, COR_GRID),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
    ]

    # Linhas alternadas
    for i in range(1, len(dados)):
        if i % 2 == 0:
            estilo.append(("BACKGROUND", (0, i), (-1, i), COR_ALT_ROW))

    t.setStyle(TableStyle(estilo))
    return t


# ── Geradores de PDF ─────────────────────────────────────────────────────

def gerar_pdf_relatorio_dia(registros, resumo, faltas, atrasos, saidas, data_filtro):
    """Gera PDF completo do relatório diário."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm,
        topMargin=2*cm, bottomMargin=2*cm,
    )
    styles = _get_styles()
    elementos = []

    # Cabeçalho
    elementos.extend(_cabecalho(
        styles,
        f"Relatório de Presença — {data_filtro}",
        f"Data: {data_filtro} · Gerado em {datetime.now().strftime('%d/%m/%Y %H:%M')}",
    ))

    # Resumo
    elementos.append(Paragraph("Resumo", styles["SecaoTitulo"]))
    resumo_dados = [
        ["Presentes", "Ausentes", "Total Cadastrados"],
        [
            str(resumo.get("presentes", 0)),
            str(resumo.get("ausentes", 0)),
            str(resumo.get("total", 0)),
        ],
    ]
    elementos.append(_tabela_estilizada(resumo_dados))
    elementos.append(Spacer(1, 12))

    # Registros
    if registros:
        elementos.append(Paragraph(f"Registros ({len(registros)})", styles["SecaoTitulo"]))
        tab_dados = [["Horário", "Nome", "Matrícula", "Turma", "Tipo"]]
        for r in registros:
            hora = str(r.get("timestamp", ""))
            if "T" in hora:
                hora = hora.split("T")[1][:5]
            elif len(hora) > 16:
                hora = hora[11:16]
            tab_dados.append([
                hora,
                r.get("nome", ""),
                r.get("matricula", ""),
                r.get("turma", "—"),
                r.get("tipo", "").upper(),
            ])
        elementos.append(_tabela_estilizada(tab_dados))
        elementos.append(Spacer(1, 12))

    # Faltas
    if faltas:
        elementos.append(Paragraph(f"Faltas ({len(faltas)})", styles["SecaoTitulo"]))
        tab_dados = [["Nome", "Matrícula", "Turma", "Status"]]
        for a in faltas:
            tab_dados.append([
                a.get("nome", ""),
                a.get("matricula", ""),
                a.get("turma", "—"),
                "AUSENTE",
            ])
        elementos.append(_tabela_estilizada(tab_dados))
        elementos.append(Spacer(1, 12))

    # Atrasos
    if atrasos:
        elementos.append(Paragraph(f"Atrasos ({len(atrasos)})", styles["SecaoTitulo"]))
        tab_dados = [["Chegada", "Nome", "Matrícula", "Turma", "Atraso"]]
        for a in atrasos:
            hora = str(a.get("timestamp", ""))
            if "T" in hora:
                hora = hora.split("T")[1][:5]
            elif len(hora) > 16:
                hora = hora[11:16]
            tab_dados.append([
                hora,
                a.get("nome", ""),
                a.get("matricula", ""),
                a.get("turma", "—"),
                f"+{a.get('minutos_atraso', 0)} min",
            ])
        elementos.append(_tabela_estilizada(tab_dados))
        elementos.append(Spacer(1, 12))

    # Saídas antecipadas
    if saidas:
        elementos.append(Paragraph(f"Saídas Antecipadas ({len(saidas)})", styles["SecaoTitulo"]))
        tab_dados = [["Saída", "Nome", "Matrícula", "Turma", "Antecipação"]]
        for s in saidas:
            hora = str(s.get("timestamp", ""))
            if "T" in hora:
                hora = hora.split("T")[1][:5]
            elif len(hora) > 16:
                hora = hora[11:16]
            tab_dados.append([
                hora,
                s.get("nome", ""),
                s.get("matricula", ""),
                s.get("turma", "—"),
                f"-{s.get('minutos_cedo', 0)} min",
            ])
        elementos.append(_tabela_estilizada(tab_dados))

    # Rodapé
    elementos.extend(_rodape(styles))

    doc.build(elementos)
    buffer.seek(0)
    return buffer


def gerar_pdf_relatorio_periodo(dados, data_inicio, data_fim, turma=None):
    """Gera PDF de relatório por período."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm,
        topMargin=2*cm, bottomMargin=2*cm,
    )
    styles = _get_styles()
    elementos = []

    titulo_turma = f" — Turma: {turma}" if turma else ""
    elementos.extend(_cabecalho(
        styles,
        f"Relatório por Período{titulo_turma}",
        f"Período: {data_inicio} a {data_fim} · Gerado em {datetime.now().strftime('%d/%m/%Y %H:%M')}",
    ))

    if dados:
        tab_dados = [["#", "Nome", "Matrícula", "Turma", "Presenças", "Faltas", "Frequência"]]
        for i, d in enumerate(dados, 1):
            tab_dados.append([
                str(i),
                d["nome"],
                d["matricula"],
                d["turma"],
                str(d["dias_presente"]),
                str(d["faltas"]),
                f"{d['percentual']}%",
            ])
        elementos.append(_tabela_estilizada(tab_dados))
    else:
        elementos.append(Paragraph("Nenhum dado encontrado para o período.", styles["Normal"]))

    elementos.extend(_rodape(styles))
    doc.build(elementos)
    buffer.seek(0)
    return buffer


def gerar_pdf_individual(dados):
    """Gera PDF de relatório individual de um aluno."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm,
        topMargin=2*cm, bottomMargin=2*cm,
    )
    styles = _get_styles()
    elementos = []

    aluno = dados["aluno"]
    elementos.extend(_cabecalho(
        styles,
        f"Relatório Individual — {aluno['nome']}",
        f"Matrícula: {aluno['matricula']} · Turma: {aluno.get('turma', '—')} · "
        f"Período: {dados['data_inicio']} a {dados['data_fim']}",
    ))

    # Resumo
    elementos.append(Paragraph("Resumo de Frequência", styles["SecaoTitulo"]))
    resumo_tab = [
        ["Dias Presente", "Faltas", "Total Dias Letivos", "Frequência"],
        [
            str(dados["dias_presente"]),
            str(dados["faltas"]),
            str(dados["total_dias"]),
            f"{dados['percentual']}%",
        ],
    ]
    elementos.append(_tabela_estilizada(resumo_tab))
    elementos.append(Spacer(1, 12))

    # Registros
    if dados["registros"]:
        elementos.append(Paragraph(f"Registros ({len(dados['registros'])})", styles["SecaoTitulo"]))
        tab_dados = [["Data", "Horário", "Tipo"]]
        for r in dados["registros"]:
            ts = str(r.get("timestamp", ""))
            if "T" in ts:
                data_str = ts[:10]
                hora_str = ts[11:16]
            else:
                data_str = ts[:10]
                hora_str = ts[11:16] if len(ts) > 16 else ts
            tab_dados.append([
                data_str,
                hora_str,
                r.get("tipo", "").upper(),
            ])
        elementos.append(_tabela_estilizada(tab_dados))

    elementos.extend(_rodape(styles))
    doc.build(elementos)
    buffer.seek(0)
    return buffer

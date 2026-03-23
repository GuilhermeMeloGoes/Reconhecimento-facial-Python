from datetime import datetime, timedelta
from database import db
from config import COOLDOWN_MINUTOS


def processar_reconhecimento(conn, resultado_facial):
    aluno_id  = resultado_facial["aluno_id"]
    nome      = resultado_facial["nome"]
    matricula = resultado_facial["matricula"]

    ultimo = db.ultimo_registro(conn, aluno_id)
    agora  = datetime.now()

    if ultimo:
        ultimo_tempo = datetime.fromisoformat(ultimo["timestamp"])
        delta = agora - ultimo_tempo

        if delta < timedelta(minutes=COOLDOWN_MINUTOS):
            minutos_restantes = COOLDOWN_MINUTOS - int(delta.total_seconds() / 60)
            return {
                "registrado": False,
                "tipo": None,
                "motivo": f"Aguarde {minutos_restantes} min para novo registro",
                "aluno": {"nome": nome, "matricula": matricula},
            }

        tipo = "saida" if ultimo["tipo"] == "entrada" else "entrada"
    else:
        tipo = "entrada"

    registro_id = db.registrar_evento(conn, aluno_id, tipo)

    return {
        "registrado":  True,
        "registro_id": registro_id,
        "tipo":        tipo,
        "timestamp":   agora.isoformat(),
        "motivo":      "ok",
        "aluno": {
            "id":        aluno_id,
            "nome":      nome,
            "matricula": matricula,
            "turma":     resultado_facial.get("turma", ""),
        },
    }


def relatorio_dia(conn, data=None):
    rows = db.registros_do_dia(conn, data)
    return [
        {
            "id":        r["id"],
            "nome":      r["nome"],
            "matricula": r["matricula"],
            "turma":     r["turma"],
            "tipo":      r["tipo"],
            "timestamp": r["timestamp"],
        }
        for r in rows
    ]


def alunos_presentes_agora(conn):
    rows = conn.execute("""
        SELECT DISTINCT a.id, a.nome, a.matricula, a.turma,
               r.timestamp as entrada_em
        FROM registros r
        JOIN alunos a ON a.id = r.aluno_id
        WHERE date(r.timestamp) = date('now','localtime')
          AND r.tipo = 'entrada'
          AND r.id = (
              SELECT id FROM registros r2
              WHERE r2.aluno_id = a.id
                AND date(r2.timestamp) = date('now','localtime')
              ORDER BY r2.timestamp DESC LIMIT 1
          )
        ORDER BY r.timestamp DESC
    """).fetchall()

    return [dict(r) for r in rows]

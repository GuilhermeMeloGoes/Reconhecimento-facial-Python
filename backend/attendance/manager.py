from datetime import datetime, timedelta
import serial
import time
from database import db
from config import COOLDOWN_MINUTOS, WOKWI_SERIAL_URL, ENABLE_WOKWI


def abrir_catraca_wokwi():
    if not ENABLE_WOKWI:
        return

    try:
        with serial.serial_for_url(WOKWI_SERIAL_URL, baudrate=9600, timeout=1) as ser:
            ser.write(b'OPEN\n')
            time.sleep(0.1)
    except Exception as e:
        print(f"Erro ao conectar ao Wokwi Serial: {e}")


def processar_reconhecimento(conn, resultado_facial, tipo_forçado=None):
    aluno_id  = resultado_facial["aluno_id"]
    nome      = resultado_facial["nome"]
    matricula = resultado_facial["matricula"]

    ultimo = db.ultimo_registro(conn, aluno_id)
    agora  = datetime.now()

    if not tipo_forçado:
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
    else:
        if ultimo:
            if tipo_forçado == "entrada" and ultimo["tipo"] == "entrada":
                return {
                    "registrado": False,
                    "tipo": None,
                    "motivo": f"{nome} já possui uma ENTRADA ativa",
                    "aluno": {"nome": nome, "matricula": matricula},
                }
            if tipo_forçado == "saida" and ultimo["tipo"] == "saida":
                return {
                    "registrado": False,
                    "tipo": None,
                    "motivo": f"{nome} já registrou SAÍDA",
                    "aluno": {"nome": nome, "matricula": matricula},
                }
        elif tipo_forçado == "saida":
            return {
                "registrado": False,
                "tipo": None,
                "motivo": "Nenhuma entrada encontrada para este aluno",
                "aluno": {"nome": nome, "matricula": matricula},
            }
        
        tipo = tipo_forçado

    registro_id = db.registrar_evento(conn, aluno_id, tipo)

    if registro_id:
        abrir_catraca_wokwi()

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
    hoje = "CURRENT_DATE()" if db.is_mysql(conn) else "date('now','localtime')"
    rows = conn.execute(f"""
        SELECT DISTINCT a.id, a.nome, a.matricula, a.turma,
               r.timestamp as entrada_em
        FROM registros r
        JOIN alunos a ON a.id = r.aluno_id
        WHERE date(r.timestamp) = {hoje}
          AND r.tipo = 'entrada'
          AND r.id = (
              SELECT id FROM registros r2
              WHERE r2.aluno_id = a.id
                AND date(r2.timestamp) = {hoje}
              ORDER BY r2.timestamp DESC LIMIT 1
          )
        ORDER BY r.timestamp DESC
    """).fetchall()

    return [dict(r) for r in rows]

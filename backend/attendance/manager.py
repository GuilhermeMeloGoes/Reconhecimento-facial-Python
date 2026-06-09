from datetime import datetime, timedelta, time as dt_time
import serial
import time
from database import db
from config import (
    COOLDOWN_MINUTOS, WOKWI_SERIAL_URL, ENABLE_WOKWI,
    HORA_ENTRADA_ESPERADA, HORA_SAIDA_ESPERADA, TOLERANCIA_MINUTOS
)


def abrir_catraca_wokwi():
    if not ENABLE_WOKWI:
        return
    try:
        with serial.serial_for_url(WOKWI_SERIAL_URL, baudrate=9600, timeout=1) as ser:
            ser.write(b'OPEN\n')
            time.sleep(0.1)
    except Exception as e:
        print(f"Erro ao conectar ao Wokwi Serial: {e}")


def _parse_hora(hora_str):
    """Converte 'HH:MM' para datetime.time."""
    h, m = map(int, hora_str.split(":"))
    return dt_time(h, m)


HORA_PERMITIDA_INICIO = dt_time(7, 0)   
HORA_PERMITIDA_FIM    = dt_time(17, 0) 


def _dentro_do_horario_permitido():
    """Verifica se o horário atual está dentro da janela de aula (07:00–17:00)."""
    agora = datetime.now().time()
    return HORA_PERMITIDA_INICIO <= agora < HORA_PERMITIDA_FIM


def processar_reconhecimento(conn, resultado_facial, tipo_forcado=None):
    aluno_id  = resultado_facial["aluno_id"]
    nome      = resultado_facial["nome"]
    matricula = resultado_facial["matricula"]

    if aluno_id is None:
        return None

    # Permitir reconhecimento a qualquer horário, mas registrar se foi fora do
    # intervalo escolar para posterior validação/relatórios.
    agora = datetime.now()
    fora_horario = not _dentro_do_horario_permitido()

    ultimo = db.ultimo_registro(conn, aluno_id)

    if not tipo_forcado:
        if ultimo:
            ultimo_tempo = datetime.fromisoformat(str(ultimo["timestamp"]))
            delta = agora - ultimo_tempo

            if delta < timedelta(minutes=COOLDOWN_MINUTOS) and COOLDOWN_MINUTOS > 0:
                minutos_restantes = COOLDOWN_MINUTOS - int(delta.total_seconds() / 60)
                return {
                    "registrado": False,
                    "tipo": None,
                    "motivo": f"Aguarde {minutos_restantes} min para novo registro",
                    "aluno": {"nome": nome, "matricula": matricula},
                    "fora_horario": fora_horario,
                }

            tipo = "saida" if ultimo["tipo"] == "entrada" else "entrada"
        else:
            tipo = "entrada"
    else:
        if ultimo:
            ultimo_data = datetime.fromisoformat(str(ultimo["timestamp"])).date()
            hoje = agora.date()

            if tipo_forcado == "entrada" and ultimo["tipo"] == "entrada" and ultimo_data == hoje:
                return {
                    "registrado": False,
                    "tipo": None,
                    "motivo": f"{nome} já possui uma ENTRADA registrada hoje",
                    "aluno": {"nome": nome, "matricula": matricula},
                    "fora_horario": fora_horario,
                }
            if tipo_forcado == "saida" and ultimo["tipo"] == "saida" and ultimo_data == hoje:
                return {
                    "registrado": False,
                    "tipo": None,
                    "motivo": f"{nome} já registrou SAÍDA hoje",
                    "aluno": {"nome": nome, "matricula": matricula},
                    "fora_horario": fora_horario,
                }
        elif tipo_forcado == "saida":
            return {
                "registrado": False,
                "tipo": None,
                "motivo": "Nenhuma entrada encontrada para este aluno hoje",
                "aluno": {"nome": nome, "matricula": matricula},
                "fora_horario": fora_horario,
            }

        tipo = tipo_forcado

    registro_id = db.registrar_evento(conn, aluno_id, tipo)

    if registro_id:
        abrir_catraca_wokwi()

    return {
        "registrado":  True,
        "registro_id": registro_id,
        "tipo":        tipo,
        "timestamp":   agora.isoformat(),
        "motivo":      "ok",
        "fora_horario": fora_horario,
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


def relatorio_faltas(conn, data=None):
    """Retorna lista de alunos que NÃO tiveram nenhum registro no dia."""
    ph = conn.placeholder
    hoje_expr = "CURRENT_DATE()" if db.is_mysql(conn) else "date('now','localtime')"
    data_filtro = data or datetime.now().strftime("%Y-%m-%d")

    if data:
        sql = f"""
            SELECT a.id, a.nome, a.matricula, a.turma
            FROM alunos a
            WHERE a.id NOT IN (
                SELECT DISTINCT r.aluno_id FROM registros r
                WHERE date(r.timestamp) = {ph}
            )
            ORDER BY a.nome
        """
        rows = conn.execute(sql, (data,)).fetchall()
    else:
        sql = f"""
            SELECT a.id, a.nome, a.matricula, a.turma
            FROM alunos a
            WHERE a.id NOT IN (
                SELECT DISTINCT r.aluno_id FROM registros r
                WHERE date(r.timestamp) = {hoje_expr}
            )
            ORDER BY a.nome
        """
        rows = conn.execute(sql).fetchall()

    return [dict(r) for r in rows]


def relatorio_atrasos_saidas_antecipadas(conn, data=None):
    """
    Retorna alunos com entrada após o horário esperado + tolerância,
    ou saída antes do horário esperado.
    """
    hora_entrada = _parse_hora(HORA_ENTRADA_ESPERADA)
    hora_saida   = _parse_hora(HORA_SAIDA_ESPERADA)
    tolerancia   = timedelta(minutes=TOLERANCIA_MINUTOS)

    limite_entrada = (
        datetime.combine(datetime.today(), hora_entrada) + tolerancia
    ).time()

    data_filtro = data or datetime.now().strftime("%Y-%m-%d")
    ph = conn.placeholder
    hoje_expr = "CURRENT_DATE()" if db.is_mysql(conn) else "date('now','localtime')"

    if data:
        sql = f"""
            SELECT a.nome, a.matricula, a.turma, r.tipo, r.timestamp
            FROM registros r
            JOIN alunos a ON a.id = r.aluno_id
            WHERE date(r.timestamp) = {ph}
              AND r.id = (
                  SELECT id FROM registros r2
                  WHERE r2.aluno_id = a.id AND r2.tipo = r.tipo
                    AND date(r2.timestamp) = {ph}
                  ORDER BY r2.timestamp ASC LIMIT 1
              )
            ORDER BY r.timestamp ASC
        """
        rows = conn.execute(sql, (data, data)).fetchall()
    else:
        sql = f"""
            SELECT a.nome, a.matricula, a.turma, r.tipo, r.timestamp
            FROM registros r
            JOIN alunos a ON a.id = r.aluno_id
            WHERE date(r.timestamp) = {hoje_expr}
              AND r.id = (
                  SELECT id FROM registros r2
                  WHERE r2.aluno_id = a.id AND r2.tipo = r.tipo
                    AND date(r2.timestamp) = {hoje_expr}
                  ORDER BY r2.timestamp ASC LIMIT 1
              )
            ORDER BY r.timestamp ASC
        """
        rows = conn.execute(sql).fetchall()

    atrasos = []
    saidas_antecipadas = []

    for r in rows:
        ts = datetime.fromisoformat(str(r["timestamp"]))
        hora_registro = ts.time()

        if r["tipo"] == "entrada" and hora_registro > limite_entrada:
            minutos_atraso = int(
                (datetime.combine(datetime.today(), hora_registro) -
                 datetime.combine(datetime.today(), hora_entrada)).total_seconds() / 60
            )
            atrasos.append({
                "nome":          r["nome"],
                "matricula":     r["matricula"],
                "turma":         r["turma"],
                "tipo":          "atraso",
                "timestamp":     r["timestamp"],
                "minutos_atraso": minutos_atraso,
                "hora_prevista": HORA_ENTRADA_ESPERADA,
            })

        elif r["tipo"] == "saida" and hora_registro < hora_saida:
            minutos_cedo = int(
                (datetime.combine(datetime.today(), hora_saida) -
                 datetime.combine(datetime.today(), hora_registro)).total_seconds() / 60
            )
            saidas_antecipadas.append({
                "nome":           r["nome"],
                "matricula":      r["matricula"],
                "turma":          r["turma"],
                "tipo":           "saida_antecipada",
                "timestamp":      r["timestamp"],
                "minutos_cedo":   minutos_cedo,
                "hora_prevista":  HORA_SAIDA_ESPERADA,
            })

    return {"atrasos": atrasos, "saidas_antecipadas": saidas_antecipadas}

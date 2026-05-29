import sys, os
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import numpy as np
import face_recognition
import base64
import threading
import time
from datetime import datetime

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

from config import FLASK_HOST, FLASK_PORT, FLASK_DEBUG, SECRET_KEY
from database import db
from face.capture import processar_imagem_base64
from face.recognizer import identificar_frame_rgb
from attendance.manager import (
    processar_reconhecimento, relatorio_dia, alunos_presentes_agora,
    relatorio_faltas, relatorio_atrasos_saidas_antecipadas
)

TEMPLATE_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "frontend", "templates"))
STATIC_DIR   = os.path.abspath(os.path.join(BASE_DIR, "..", "frontend", "static"))
REACT_DIST   = os.path.abspath(os.path.join(BASE_DIR, "..", "frontend", "static", "dist"))

app = Flask(__name__, template_folder=TEMPLATE_DIR, static_folder=STATIC_DIR)
app.secret_key = SECRET_KEY

# CORS — permite que o celular acesse a API via HTTPS do Railway
CORS(app, resources={r"/api/*": {"origins": "*"}})

conn      = db.get_conn()
db.criar_tabelas(conn)
alunos_db = db.carregar_alunos(conn)
_db_lock  = threading.Lock()

_event_queue = []
_event_lock  = threading.Lock()

# Cooldown por aluno para evitar registros duplicados
_ultimo_registro_ts = {}
_cooldown_lock = threading.Lock()
COOLDOWN_RECONHECIMENTO_S = 5


def recarregar_alunos():
    global alunos_db
    with _db_lock:
        alunos_db = db.carregar_alunos(conn)


# ── Rotas ─────────────────────────────────────────────────────────────────────

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_react(path):
    """Serve o build do React (ou a API sobrepõe com as rotas /api/)."""
    if path and os.path.exists(os.path.join(REACT_DIST, path)):
        return send_from_directory(REACT_DIST, path)
    index = os.path.join(REACT_DIST, "index.html")
    if os.path.exists(index):
        return send_from_directory(REACT_DIST, "index.html")
    return jsonify({"status": "API online", "frontend": "build não encontrado"}), 200


# ── ROTA PRINCIPAL: Reconhecimento via câmera do celular ───────────────────────
@app.route("/api/reconhecer_frame", methods=["POST"])
def api_reconhecer_frame():
    """
    Recebe um frame em base64 capturado pela câmera do celular.
    Identifica o rosto, registra entrada/saída e retorna o resultado.
    """
    data = request.get_json(silent=True) or {}
    imagem_b64  = data.get("imagem_b64", "").strip()
    tipo_forcado = data.get("tipo")  # 'entrada', 'saida' ou None (automático)

    if not imagem_b64:
        return jsonify({"ok": False, "erro": "Imagem não enviada"}), 400

    # Decodifica e extrai embedding do frame
    try:
        img_bytes = base64.b64decode(imagem_b64)
        img_array = np.frombuffer(img_bytes, dtype=np.uint8)
        import cv2
        frame = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        if frame is None:
            return jsonify({"ok": False, "erro": "Imagem inválida"}), 400
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    except Exception as e:
        return jsonify({"ok": False, "erro": f"Erro ao processar imagem: {str(e)}"}), 400

    # Identifica rostos no frame
    resultados = identificar_frame_rgb(rgb, alunos_db)

    if not resultados:
        return jsonify({
            "ok": True,
            "reconhecido": False,
            "mensagem": "Nenhum rosto detectado"
        })

    # Processa apenas o rosto com maior confiança
    melhor = max(resultados, key=lambda r: r.get("confianca", 0))

    if melhor.get("aluno_id") is None:
        return jsonify({
            "ok": True,
            "reconhecido": False,
            "mensagem": "Rosto desconhecido",
            "confianca": melhor.get("confianca", 0)
        })

    aluno_id = melhor["aluno_id"]

    # Cooldown: evita múltiplos registros em rafagas
    agora = datetime.now()
    with _cooldown_lock:
        ultimo_ts = _ultimo_registro_ts.get(aluno_id)
        if ultimo_ts and (agora - ultimo_ts).total_seconds() < COOLDOWN_RECONHECIMENTO_S:
            return jsonify({
                "ok": True,
                "reconhecido": True,
                "registrado": False,
                "mensagem": "Aguarde alguns segundos para novo registro",
                "aluno": {
                    "nome":      melhor["nome"],
                    "matricula": melhor["matricula"],
                    "turma":     melhor.get("turma", ""),
                },
                "confianca": melhor.get("confianca", 0)
            })
        _ultimo_registro_ts[aluno_id] = agora

    # Registra no banco
    c = db.get_conn()
    try:
        resultado_att = processar_reconhecimento(c, melhor, tipo_forcado)
    except Exception as e:
        c.close()
        return jsonify({"ok": False, "erro": str(e)}), 500

    c.close()

    if resultado_att and resultado_att.get("registrado"):
        with _event_lock:
            _event_queue.append({
                "id":        resultado_att["registro_id"],
                "nome":      resultado_att["aluno"]["nome"],
                "tipo":      resultado_att["tipo"],
                "timestamp": resultado_att["timestamp"],
                "turma":     resultado_att["aluno"].get("turma", ""),
            })
            if len(_event_queue) > 20:
                _event_queue.pop(0)

        return jsonify({
            "ok":         True,
            "reconhecido": True,
            "registrado":  True,
            "tipo":        resultado_att["tipo"],
            "aluno":       resultado_att["aluno"],
            "confianca":   melhor.get("confianca", 0),
            "timestamp":   resultado_att["timestamp"],
        })
    else:
        return jsonify({
            "ok":          True,
            "reconhecido": True,
            "registrado":  False,
            "mensagem":    resultado_att.get("motivo", "") if resultado_att else "Não registrado",
            "aluno": {
                "nome":      melhor["nome"],
                "matricula": melhor["matricula"],
                "turma":     melhor.get("turma", ""),
            },
            "confianca": melhor.get("confianca", 0),
            "fora_horario": resultado_att.get("fora_horario", False) if resultado_att else False,
        })


# ── Cadastro ───────────────────────────────────────────────────────────────────
@app.route("/api/cadastrar", methods=["POST"])
def cadastrar_post():
    data = request.get_json(silent=True) or request.form
    nome       = data.get("nome", "").strip()
    matricula  = data.get("matricula", "").strip()
    turma      = data.get("turma", "").strip()
    imagem_b64 = data.get("imagem_b64", "").strip()

    if not nome or not matricula:
        return jsonify({"ok": False, "erro": "Nome e matrícula são obrigatórios"}), 400

    if not imagem_b64:
        return jsonify({"ok": False, "erro": "Imagem não enviada. Use a câmera do dispositivo."}), 400

    embedding, foto_b64 = processar_imagem_base64(imagem_b64)
    if embedding is None:
        return jsonify({
            "ok": False,
            "erro": "Rosto não detectado na foto. Tente novamente com boa iluminação e o rosto centralizado."
        }), 422

    foto_path = None
    if foto_b64:
        pasta = os.path.join(os.path.dirname(__file__), "static", "fotos")
        os.makedirs(pasta, exist_ok=True)
        foto_path = os.path.join(pasta, f"{matricula}.jpg")
        with open(foto_path, "wb") as f:
            f.write(base64.b64decode(foto_b64))

    with _db_lock:
        try:
            aluno_id = db.salvar_aluno(conn, nome, matricula, turma, embedding, foto_path)
        except Exception as e:
            return jsonify({"ok": False, "erro": str(e)}), 409

    recarregar_alunos()
    return jsonify({"ok": True, "aluno_id": aluno_id, "nome": nome})


# ── Alunos ─────────────────────────────────────────────────────────────────────
@app.route("/api/alunos")
def api_listar_alunos():
    try:
        lista = db.listar_alunos(conn)
        return jsonify([dict(r) for r in lista])
    except Exception as e:
        return jsonify({"ok": False, "erro": str(e)}), 500


@app.route("/api/alunos/<int:aluno_id>", methods=["DELETE"])
def api_deletar_aluno(aluno_id):
    with _db_lock:
        db.deletar_aluno(conn, aluno_id)
    recarregar_alunos()
    return jsonify({"ok": True})


@app.route("/api/alunos/<int:aluno_id>", methods=["PUT"])
def api_atualizar_aluno(aluno_id):
    data  = request.get_json(silent=True) or {}
    nome  = data.get("nome", "").strip()
    turma = data.get("turma", "").strip()

    if not nome:
        return jsonify({"ok": False, "erro": "Nome é obrigatório"}), 400

    with _db_lock:
        db.atualizar_aluno(conn, aluno_id, nome, turma)

    recarregar_alunos()
    return jsonify({"ok": True})


# ── Relatórios ─────────────────────────────────────────────────────────────────
@app.route("/api/relatorio")
def api_relatorio():
    data        = request.args.get("data")
    registros   = relatorio_dia(conn, data)
    presentes   = alunos_presentes_agora(conn)
    resumo      = db.resumo_presenca(conn, data)
    faltas      = relatorio_faltas(conn, data)
    ocorrencias = relatorio_atrasos_saidas_antecipadas(conn, data)
    return jsonify({
        "registros":          registros,
        "presentes":          presentes,
        "resumo":             resumo,
        "faltas":             faltas,
        "atrasos":            ocorrencias["atrasos"],
        "saidas_antecipadas": ocorrencias["saidas_antecipadas"],
        "data_filtro":        data or datetime.now().strftime("%Y-%m-%d"),
    })


@app.route("/api/presentes")
def api_presentes():
    return jsonify(alunos_presentes_agora(conn))


@app.route("/api/atividades")
def api_atividades():
    with _db_lock:
        data = relatorio_dia(conn)
        data = sorted(data, key=lambda x: x["timestamp"], reverse=True)[:20]
    return jsonify(data)


@app.route("/api/resumo")
def api_resumo():
    return jsonify(db.resumo_presenca(conn))


@app.route("/api/status")
def api_status():
    return jsonify({
        "alunos_cadastrados": len(alunos_db),
        "hora": datetime.now().isoformat(),
    })


@app.route("/api/events")
def api_events():
    global _event_queue
    with _event_lock:
        events = list(_event_queue)
        _event_queue.clear()
    return jsonify(events)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", FLASK_PORT))
    app.run(host=FLASK_HOST, port=port, debug=FLASK_DEBUG)

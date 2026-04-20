import sys, os
# Garante que a pasta backend está no path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)
 
import cv2
import numpy as np
import face_recognition
import base64
import threading
import time
from datetime import datetime
 
from flask import (Flask, render_template, request, jsonify,
                   Response, redirect, url_for, flash)
 
from config import FLASK_HOST, FLASK_PORT, FLASK_DEBUG, SECRET_KEY, CAMERA_INDEX
from database import db
from face.capture import capturar_embedding_cadastro, gerar_frame_reconhecimento
from face.recognizer import identificar_frame, anotar_frame
from attendance.manager import processar_reconhecimento, relatorio_dia, alunos_presentes_agora
from thingsboard_client.client import ThingsBoardClient
 
# Ajuste dos caminhos para a pasta frontend
TEMPLATE_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "frontend", "templates"))
STATIC_DIR   = os.path.abspath(os.path.join(BASE_DIR, "..", "frontend", "static"))

app = Flask(__name__, template_folder=TEMPLATE_DIR, static_folder=STATIC_DIR)
app.secret_key = SECRET_KEY
 
conn       = db.get_conn()
db.criar_tabelas(conn)
tb_client  = ThingsBoardClient(conn)
alunos_db  = db.carregar_alunos(conn) 
_db_lock   = threading.Lock()
 
def recarregar_alunos():
    global alunos_db
    with _db_lock:
        alunos_db = db.carregar_alunos(conn)

 
def _video_com_reconhecimento():
    cap = cv2.VideoCapture(CAMERA_INDEX)
    ultimo_registro = {}
 
    while True:
        ret, frame = cap.read()
        if not ret:
            break
 
        resultados = identificar_frame(frame, alunos_db)
        frame_anotado = anotar_frame(frame, resultados)
 
        for r in resultados:
            aid = r["aluno_id"]
            agora = datetime.now()
            if aid not in ultimo_registro or (agora - ultimo_registro[aid]).seconds > 10:
                ultimo_registro[aid] = agora
                with _db_lock:
                    resultado_att = processar_reconhecimento(conn, r)
                if resultado_att["registrado"]:
                    tb_client.enviar_evento_presenca({
                        **resultado_att["aluno"],
                        "id":        resultado_att["registro_id"],
                        "tipo":      resultado_att["tipo"],
                        "timestamp": resultado_att["timestamp"],
                    })
 
        _, buf = cv2.imencode(".jpg", frame_anotado, [cv2.IMWRITE_JPEG_QUALITY, 75])
        yield (
            b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" +
            buf.tobytes() + b"\r\n"
        )
 
    cap.release()
 
@app.route("/")
def index():
    return render_template("index.html")
 
@app.route("/entrada")
def entrada_page():
    return render_template("entrada.html")

@app.route("/saida")
def saida_page():
    return render_template("saida.html")
 
@app.route("/video_feed")
def video_feed():
    return Response(_video_com_reconhecimento(),
                    mimetype="multipart/x-mixed-replace; boundary=frame")
 
@app.route("/cadastrar", methods=["GET"])
def cadastrar_form():
    return render_template("cadastrar.html")
 
 
@app.route("/cadastrar", methods=["POST"])
def cadastrar_post():
    data = request.get_json() if request.is_json else request.form
    nome      = data.get("nome", "").strip()
    matricula = data.get("matricula", "").strip()
    turma     = data.get("turma", "").strip()
 
    if not nome or not matricula:
        return jsonify({"ok": False, "erro": "Nome e matrícula são obrigatórios"}), 400
 
    embedding, foto_b64 = capturar_embedding_cadastro()
 
    if embedding is None:
        return jsonify({"ok": False, "erro": "Rosto não detectado. Tente novamente."}), 422
 
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
    tb_client._enviar_atributos({"total_alunos": len(alunos_db)})
 
    return jsonify({"ok": True, "aluno_id": aluno_id, "nome": nome})
 
@app.route("/alunos")
def alunos_page():
    return render_template("alunos.html")
 
@app.route("/api/alunos")
def api_listar_alunos():
    try:
        lista = db.listar_alunos(conn)
        resultado = [dict(r) for r in lista]
        print(f"DEBUG: Enviando {len(resultado)} alunos via API")
        return jsonify(resultado)
    except Exception as e:
        print(f"DEBUG ERROR: {e}")
        return jsonify({"ok": False, "erro": str(e)}), 500
 
 
@app.route("/api/alunos/<int:aluno_id>", methods=["DELETE"])
def api_deletar_aluno(aluno_id):
    with _db_lock:
        db.deletar_aluno(conn, aluno_id)
    recarregar_alunos()
    return jsonify({"ok": True})


@app.route("/api/alunos/<int:aluno_id>", methods=["PUT"])
def api_atualizar_aluno(aluno_id):
    data = request.get_json()
    nome = data.get("nome", "").strip()
    turma = data.get("turma", "").strip()

    if not nome:
        return jsonify({"ok": False, "erro": "Nome é obrigatório"}), 400

    with _db_lock:
        db.atualizar_aluno(conn, aluno_id, nome, turma)
    
    recarregar_alunos()
    return jsonify({"ok": True})


@app.route("/relatorio")
def relatorio_page():
    return render_template("relatorio.html")

@app.route("/api/relatorio")
def api_relatorio():
    data      = request.args.get("data")
    registros = relatorio_dia(conn, data)
    presentes = alunos_presentes_agora(conn)
    resumo    = db.resumo_presenca(conn, data)
    return jsonify({
        "registros": registros,
        "presentes": presentes,
        "resumo": resumo,
        "data_filtro": data or datetime.now().strftime("%Y-%m-%d")
    })
 
@app.route("/api/presentes")
def api_presentes():
    return jsonify(alunos_presentes_agora(conn))
 
 
@app.route("/api/resumo")
def api_resumo():
    return jsonify(db.resumo_presenca(conn))
 
 
@app.route("/api/status")
def api_status():
    return jsonify({
        "thingsboard": tb_client.conectado,
        "alunos_cadastrados": len(alunos_db),
        "hora": datetime.now().isoformat(),
    })
 
 
if __name__ == "__main__":
    app.run(host=FLASK_HOST, port=FLASK_PORT, debug=FLASK_DEBUG)
 
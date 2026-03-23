import sys, os
# Garante que a raiz do projeto está no path antes de qualquer import interno
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
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
 
app = Flask(__name__, template_folder="templates", static_folder="static")
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
    resumo  = db.resumo_presenca(conn)
    tb_ok   = tb_client.conectado
    return render_template("index.html", resumo=resumo, tb_ok=tb_ok)
 
 
@app.route("/video_feed")
def video_feed():
    return Response(_video_com_reconhecimento(),
                    mimetype="multipart/x-mixed-replace; boundary=frame")
 
@app.route("/cadastrar", methods=["GET"])
def cadastrar_form():
    return render_template("cadastrar.html")
 
 
@app.route("/cadastrar", methods=["POST"])
def cadastrar_post():
    nome      = request.form.get("nome", "").strip()
    matricula = request.form.get("matricula", "").strip()
    turma     = request.form.get("turma", "").strip()
 
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
def alunos():
    lista = db.listar_alunos(conn)
    return render_template("alunos.html", alunos=lista)
 
 
@app.route("/alunos/<int:aluno_id>/deletar", methods=["POST"])
def deletar_aluno(aluno_id):
    with _db_lock:
        db.deletar_aluno(conn, aluno_id)
    recarregar_alunos()
    return redirect(url_for("alunos"))
 
@app.route("/relatorio")
def relatorio():
    data      = request.args.get("data")
    registros = relatorio_dia(conn, data)
    presentes = alunos_presentes_agora(conn)
    resumo    = db.resumo_presenca(conn, data)
    return render_template("relatorio.html",
                           registros=registros,
                           presentes=presentes,
                           resumo=resumo,
                           data_filtro=data or datetime.now().strftime("%Y-%m-%d"))
 
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
 
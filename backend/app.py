import sys, os
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
 
TEMPLATE_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "frontend", "templates"))
STATIC_DIR   = os.path.abspath(os.path.join(BASE_DIR, "..", "frontend", "static"))

app = Flask(__name__, template_folder=TEMPLATE_DIR, static_folder=STATIC_DIR)
app.secret_key = SECRET_KEY
 
conn       = db.get_conn()
db.criar_tabelas(conn)
tb_client  = ThingsBoardClient(conn)
alunos_db  = db.carregar_alunos(conn) 
_db_lock   = threading.Lock()

_event_queue = []
_event_lock = threading.Lock()
 
def recarregar_alunos():
    global alunos_db
    with _db_lock:
        alunos_db = db.carregar_alunos(conn)

 
_global_cap = None
_cap_lock = threading.Lock()

_recon_threads = {}
_last_frame = None
_last_results = {}
_results_lock = threading.Lock()
_frame_lock = threading.Lock()
_stream_clients = {}
_stream_lock = threading.Lock()


def close_camera():
    global _global_cap
    with _cap_lock:
        if _global_cap is not None:
            try:
                _global_cap.release()
            finally:
                _global_cap = None


def stop_all_reconhecimento():
    global _recon_threads, _last_frame
    with _stream_lock:
        _stream_clients.clear()
    for key, (thread, _) in list(_recon_threads.items()):
        _recon_threads[key] = (thread, False)
    with _frame_lock:
        _last_frame = None
    close_camera()

def get_camera():
    global _global_cap
    with _cap_lock:
        if _global_cap is None or not _global_cap.isOpened():
            _global_cap = cv2.VideoCapture(CAMERA_INDEX, cv2.CAP_DSHOW)
            if not _global_cap.isOpened():
                _global_cap.release()
                _global_cap = None
                return None
            _global_cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            _global_cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            _global_cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        return _global_cap

def _recon_worker(tipo_forçado=None):
    global _last_frame, _last_results, _recon_threads
    ultimo_registro = {}
    process_scale = 0.5
    inv_scale = 1.0 / process_scale
    
    thread_key = tipo_forçado if tipo_forçado else "auto"

    while _recon_threads.get(thread_key, (None, False))[1]:
        frame_para_processar = None
        with _frame_lock:
            if _last_frame is not None:
                frame_para_processar = _last_frame.copy()
        
        if frame_para_processar is not None:
            small_frame = cv2.resize(frame_para_processar, (0, 0), fx=process_scale, fy=process_scale)
            
            resultados = identificar_frame(small_frame, alunos_db)
            
            for res in resultados:
                if "box" in res:
                    top, right, bottom, left = res["box"]
                    res["box"] = (int(top*inv_scale), int(right*inv_scale), 
                                 int(bottom*inv_scale), int(left*inv_scale))

            with _results_lock:
                _last_results[thread_key] = resultados

            for r in resultados:
                aid = r["aluno_id"]
                agora = datetime.now()
                if aid not in ultimo_registro or (agora - ultimo_registro[aid]).seconds > 5:
                    ultimo_registro[aid] = agora
                    def task(res_info, t_forcado):
                        from attendance.manager import processar_reconhecimento
                        from database.db import get_conn
                        
                        conn = get_conn()
                        try:
                            res_att = processar_reconhecimento(conn, res_info, t_forcado)
                            if res_att:
                                try:
                                    tb_client.enviar_evento_presenca({
                                        **res_att["aluno"],
                                        "id":        res_att["registro_id"],
                                        "tipo":      res_att["tipo"],
                                        "timestamp": res_att["timestamp"],
                                    })
                                    
                                    with _event_lock:
                                        _event_queue.append({
                                            "id": res_att["registro_id"],
                                            "nome": res_att["aluno"]["nome"],
                                            "tipo": res_att["tipo"],
                                            "timestamp": res_att["timestamp"]
                                        })
                                        if len(_event_queue) > 10:
                                            _event_queue.pop(0)
                                except Exception as e_inner:
                                    print(f"Erro no envio de evento: {e_inner}")
                        finally:
                            conn.close()
                                
                    threading.Thread(target=task, args=(r, tipo_forçado), daemon=True).start()
        
        time.sleep(0.01)

def _video_com_reconhecimento(tipo_forçado=None):
    global _recon_threads, _last_frame, _last_results
    thread_key = tipo_forçado if tipo_forçado else "auto"
    with _stream_lock:
        _stream_clients[thread_key] = _stream_clients.get(thread_key, 0) + 1

    if thread_key not in _recon_threads or not _recon_threads[thread_key][1]:
        running_flag = True
        thread = threading.Thread(target=_recon_worker, args=(tipo_forçado,), daemon=True)
        _recon_threads[thread_key] = (thread, running_flag)
        thread.start()

    try:
        while True:
            cap = get_camera()
            if cap is None:
                time.sleep(0.2)
                continue

            ret, frame = cap.read()
            if not ret:
                time.sleep(0.01)
                continue

            with _frame_lock:
                _last_frame = frame.copy()

            with _results_lock:
                cache_atual = _last_results.get(thread_key, []).copy()

            frame_exibicao = anotar_frame(frame, cache_atual)

            _, buf = cv2.imencode(".jpg", frame_exibicao, [cv2.IMWRITE_JPEG_QUALITY, 60])
            yield (
                b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" +
                buf.tobytes() + b"\r\n"
            )
    finally:
        should_release_camera = False
        with _stream_lock:
            atual = _stream_clients.get(thread_key, 0) - 1
            if atual <= 0:
                _stream_clients.pop(thread_key, None)
                if thread_key in _recon_threads:
                    thread, _ = _recon_threads[thread_key]
                    _recon_threads[thread_key] = (thread, False)
            else:
                _stream_clients[thread_key] = atual
            should_release_camera = len(_stream_clients) == 0

        if should_release_camera:
            close_camera()
 
@app.route("/")
def index():
    return render_template("index.html")
 
@app.route("/reconhecimento")
def reconhecimento_page():
    return render_template("reconhecimento.html")
 
@app.route("/video_feed")
def video_feed():
    tipo = request.args.get("tipo")
    if tipo == "auto": tipo = None
    return Response(_video_com_reconhecimento(tipo),
                    mimetype="multipart/x-mixed-replace; boundary=frame")
 
@app.route("/cadastrar", methods=["GET"])
def cadastrar_form():
    return render_template("cadastrar.html")
 
 
@app.route("/cadastrar", methods=["POST"])
def cadastrar_post():
    stop_all_reconhecimento()

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
        "thingsboard": tb_client.conectado,
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
    app.run(host=FLASK_HOST, port=FLASK_PORT, debug=FLASK_DEBUG)
 
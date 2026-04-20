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

 
# Cache global da câmera para evitar reabertura lenta
_global_cap = None
_cap_lock = threading.Lock()

def get_camera():
    global _global_cap
    with _cap_lock:
        if _global_cap is None or not _global_cap.isOpened():
            _global_cap = cv2.VideoCapture(CAMERA_INDEX)
            # Resolução equilibrada para performance
            _global_cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            _global_cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            _global_cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        return _global_cap

def _video_com_reconhecimento(tipo_forçado=None):
    cap = get_camera()
    ultimo_registro = {}
    frame_count = 0
    cache_resultados = []
    process_scale = 0.5  # Reduzir frame para processamento (IA)
 
    while True:
        ret, frame = cap.read()
        if not ret:
            time.sleep(0.01)
            continue
        
        frame_count += 1
        
        # IA escalonada: Reduz latência processando frames intervalados
        if frame_count % 6 == 0:
            # Downscaling para processamento
            small_frame = cv2.resize(frame, (0, 0), fx=process_scale, fy=process_scale)
            
            # Identificar no frame já reduzido (otimiza CPU)
            cache_resultados = identificar_frame(small_frame, alunos_db)
            
            # Ajustar coordenadas de volta para o tamanho de exibição (original)
            inv_scale = 1.0 / process_scale
            for res in cache_resultados:
                if "box" in res:
                    top, right, bottom, left = res["box"]
                    res["box"] = (int(top*inv_scale), int(right*inv_scale), 
                                 int(bottom*inv_scale), int(left*inv_scale))

            # Lógica assíncrona para DB/IoT (evita 'stutter' no vídeo)
            for r in cache_resultados:
                aid = r["aluno_id"]
                agora = datetime.now()
                if aid not in ultimo_registro or (agora - ultimo_registro[aid]).seconds > 5:
                    ultimo_registro[aid] = agora
                    # Offload do processamento de banco e rede para thread secundária
                    def task(res, t_f):
                        with _db_lock:
                            res_att = processar_reconhecimento(conn, res, tipo_forçado=t_f)
                            if res_att["registrado"]:
                                tb_client.enviar_evento_presenca({
                                    **res_att["aluno"],
                                    "id":        res_att["registro_id"],
                                    "tipo":      res_att["tipo"],
                                    "timestamp": res_att["timestamp"],
                                })
                    threading.Thread(target=task, args=(r, tipo_forçado), daemon=True).start()

        # Desenhar usando cache (mantém FPS alto no browser)
        frame_exibicao = anotar_frame(frame, cache_resultados)
 
        # Enviar para o navegador com compressão eficiente
        _, buf = cv2.imencode(".jpg", frame_exibicao, [cv2.IMWRITE_JPEG_QUALITY, 60])
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
    tipo = request.args.get("tipo", "entrada")
    return Response(_video_com_reconhecimento(tipo),
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

@app.route("/api/atividades")
def api_atividades():
    with _db_lock:
        # Pega os últimos 20 registros do dia
        data = relatorio_dia(conn)
        # Ordena por timestamp decrescente
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
 
 
if __name__ == "__main__":
    app.run(host=FLASK_HOST, port=FLASK_PORT, debug=FLASK_DEBUG)
 
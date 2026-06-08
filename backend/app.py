import sys, os
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import numpy as np
import face_recognition
import base64
import threading
import time
import logging
from datetime import datetime

from flask import Flask, request, jsonify, send_from_directory, Response
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, jwt_required, get_jwt_identity, get_jwt,
)

from config import FLASK_HOST, FLASK_PORT, FLASK_DEBUG, SECRET_KEY
from database import db
from face.capture import processar_imagem_base64
from face.recognizer import identificar_frame_rgb
from attendance.manager import (
    processar_reconhecimento, relatorio_dia, alunos_presentes_agora,
    relatorio_faltas, relatorio_atrasos_saidas_antecipadas
)
from auth.routes import auth_bp
from auth.models import is_token_blacklisted
from reports.generator import (
    relatorio_periodo, relatorio_individual,
    ranking_frequencia, resumo_por_turma,
    listar_turmas, presencas_aluno_mes,
)
from reports.pdf_export import (
    gerar_pdf_relatorio_dia, gerar_pdf_relatorio_periodo,
    gerar_pdf_individual,
)
from reports.csv_export import (
    gerar_csv_relatorio_dia, gerar_csv_relatorio_periodo,
    gerar_csv_individual,
)
from database import parent_links as parent_links_db
from auth.models import buscar_por_id

TEMPLATE_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "frontend", "templates"))
STATIC_DIR   = os.path.abspath(os.path.join(BASE_DIR, "..", "frontend", "static"))
REACT_DIST   = os.path.abspath(os.path.join(BASE_DIR, "..", "frontend", "static", "dist"))

app = Flask(__name__, template_folder=TEMPLATE_DIR, static_folder=STATIC_DIR)
app.secret_key = SECRET_KEY

# ── JWT Configuration ────────────────────────────────────────────────────
app.config["JWT_SECRET_KEY"] = SECRET_KEY
app.config["JWT_TOKEN_LOCATION"] = ["headers"]
app.config["JWT_HEADER_NAME"] = "Authorization"
app.config["JWT_HEADER_TYPE"] = "Bearer"

jwt = JWTManager(app)

@jwt.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):
    jti = jwt_payload["jti"]
    c = db.get_conn()
    try:
        return is_token_blacklisted(c, jti)
    finally:
        c.close()

@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    return jsonify({"ok": False, "erro": "Token expirado", "code": "token_expired"}), 401

@jwt.invalid_token_loader
def invalid_token_callback(error):
    return jsonify({"ok": False, "erro": "Token inválido", "code": "invalid_token"}), 401

@jwt.unauthorized_loader
def missing_token_callback(error):
    return jsonify({"ok": False, "erro": "Token não fornecido", "code": "missing_token"}), 401

# ── Register Blueprints ──────────────────────────────────────────────────
app.register_blueprint(auth_bp)

CORS(app, resources={r"/api/*": {"origins": "*"}})

alunos_db = []
_db_lock  = threading.Lock()
_db_initialized = False

_event_queue = []
_event_lock  = threading.Lock()

_ultimo_registro_ts = {}
_cooldown_lock = threading.Lock()
COOLDOWN_RECONHECIMENTO_S = 5

logger = logging.getLogger(__name__)


def _init_db():
    """Inicializa o banco (lazy loading thread-safe)."""
    global _db_initialized, alunos_db
    if _db_initialized:
        return
    with _db_lock:
        if _db_initialized:
            return
        try:
            logger.info("Inicializando banco de dados...")
            c = db.get_conn()
            try:
                db.criar_tabelas(c)
                alunos_db = db.carregar_alunos(c)
            finally:
                c.close()
            _db_initialized = True
            logger.info("Banco inicializado com %d alunos.", len(alunos_db))
        except Exception as e:
            logger.error("Erro ao inicializar banco: %s", e)


def _init_db_background():
    """Dispara inicializacao do banco em thread separada."""
    t = threading.Thread(target=_init_db, daemon=True)
    t.start()


# Dispara inicializacao em background logo ao importar o modulo.
# O worker do gunicorn fica livre para responder ao healthcheck
# enquanto o banco carrega em paralelo.
_init_db_background()


@app.before_request
def ensure_db():
    # O healthcheck /api/status responde mesmo sem o banco pronto
    if request.endpoint == 'api_status':
        return
    _init_db()


def recarregar_alunos():
    global alunos_db
    with _db_lock:
        c = db.get_conn()
        try:
            alunos_db = db.carregar_alunos(c)
        finally:
            c.close()


# ── Helper: check admin ─────────────────────────────────────────────────
def _is_admin():
    """Retorna True se o JWT atual é de um admin."""
    try:
        claims = get_jwt()
        return claims.get("perfil") == "admin"
    except Exception:
        return False


# ═══════════════════════════════════════════════════════════════════════════
#  ROTAS PÚBLICAS (sem autenticação)
# ═══════════════════════════════════════════════════════════════════════════

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


@app.route("/api/reconhecer_frame", methods=["POST"])
def api_reconhecer_frame():
    """
    Recebe um frame em base64 capturado pela câmera do celular.
    Identifica o rosto, registra entrada/saída e retorna o resultado.
    SEM autenticação — fluxo de câmera precisa ser rápido.
    """
    data = request.get_json(silent=True) or {}
    imagem_b64  = data.get("imagem_b64", "").strip()
    tipo_forcado = data.get("tipo")

    if not imagem_b64:
        return jsonify({"ok": False, "erro": "Imagem não enviada"}), 400

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

    resultados = identificar_frame_rgb(rgb, alunos_db)

    if not resultados:
        return jsonify({
            "ok": True,
            "reconhecido": False,
            "mensagem": "Nenhum rosto detectado"
        })

    melhor = max(resultados, key=lambda r: r.get("confianca", 0))

    if melhor.get("aluno_id") is None:
        return jsonify({
            "ok": True,
            "reconhecido": False,
            "mensagem": "Rosto desconhecido",
            "confianca": melhor.get("confianca", 0)
        })

    aluno_id = melhor["aluno_id"]

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


@app.route("/api/events")
def api_events():
    global _event_queue
    with _event_lock:
        events = list(_event_queue)
        _event_queue.clear()
    return jsonify(events)


@app.route("/api/status")
def api_status():
    return jsonify({
        "status": "online",
        "db_ready": _db_initialized,
        "alunos_cadastrados": len(alunos_db),
        "hora": datetime.now().isoformat(),
    })


# ═══════════════════════════════════════════════════════════════════════════
#  ROTAS ADMIN (requerem JWT de admin)
# ═══════════════════════════════════════════════════════════════════════════

@app.route("/api/cadastrar", methods=["POST"])
@jwt_required()
def cadastrar_post():
    if not _is_admin():
        return jsonify({"ok": False, "erro": "Acesso negado"}), 403

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

    c = db.get_conn()
    try:
        aluno_id = db.salvar_aluno(c, nome, matricula, turma, embedding, foto_path)
        c.commit()
    except Exception as e:
        c.close()
        return jsonify({"ok": False, "erro": str(e)}), 409
    finally:
        c.close()

    recarregar_alunos()
    return jsonify({"ok": True, "aluno_id": aluno_id, "nome": nome})


@app.route("/api/alunos")
@jwt_required()
def api_listar_alunos():
    if not _is_admin():
        return jsonify({"ok": False, "erro": "Acesso negado"}), 403
    c = db.get_conn()
    try:
        lista = db.listar_alunos(c)
        return jsonify([dict(r) for r in lista])
    except Exception as e:
        return jsonify({"ok": False, "erro": str(e)}), 500
    finally:
        c.close()


@app.route("/api/alunos/<int:aluno_id>", methods=["DELETE"])
@jwt_required()
def api_deletar_aluno(aluno_id):
    if not _is_admin():
        return jsonify({"ok": False, "erro": "Acesso negado"}), 403
    c = db.get_conn()
    try:
        db.deletar_aluno(c, aluno_id)
    finally:
        c.close()
    recarregar_alunos()
    return jsonify({"ok": True})


@app.route("/api/alunos/<int:aluno_id>", methods=["PUT"])
@jwt_required()
def api_atualizar_aluno(aluno_id):
    if not _is_admin():
        return jsonify({"ok": False, "erro": "Acesso negado"}), 403
    data  = request.get_json(silent=True) or {}
    nome  = data.get("nome", "").strip()
    turma = data.get("turma", "").strip()

    if not nome:
        return jsonify({"ok": False, "erro": "Nome é obrigatório"}), 400

    c = db.get_conn()
    try:
        db.atualizar_aluno(c, aluno_id, nome, turma)
    finally:
        c.close()

    recarregar_alunos()
    return jsonify({"ok": True})


@app.route("/api/relatorio")
@jwt_required()
def api_relatorio():
    if not _is_admin():
        return jsonify({"ok": False, "erro": "Acesso negado"}), 403
    data = request.args.get("data")
    c = db.get_conn()
    try:
        registros   = relatorio_dia(c, data)
        presentes   = alunos_presentes_agora(c)
        resumo      = db.resumo_presenca(c, data)
        faltas      = relatorio_faltas(c, data)
        ocorrencias = relatorio_atrasos_saidas_antecipadas(c, data)
    finally:
        c.close()
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
@jwt_required()
def api_presentes():
    c = db.get_conn()
    try:
        return jsonify(alunos_presentes_agora(c))
    finally:
        c.close()


@app.route("/api/atividades")
@jwt_required()
def api_atividades():
    c = db.get_conn()
    try:
        data = relatorio_dia(c)
        data = sorted(data, key=lambda x: x["timestamp"], reverse=True)[:20]
    finally:
        c.close()
    return jsonify(data)


@app.route("/api/resumo")
@jwt_required()
def api_resumo():
    c = db.get_conn()
    try:
        return jsonify(db.resumo_presenca(c))
    finally:
        c.close()


# ═══════════════════════════════════════════════════════════════════════════
#  ROTAS DE RELATÓRIOS AVANÇADOS (admin)
# ═══════════════════════════════════════════════════════════════════════════

@app.route("/api/turmas")
@jwt_required()
def api_turmas():
    """Lista turmas únicas."""
    c = db.get_conn()
    try:
        turmas = listar_turmas(c)
    finally:
        c.close()
    return jsonify(turmas)


@app.route("/api/relatorio/periodo")
@jwt_required()
def api_relatorio_periodo():
    if not _is_admin():
        return jsonify({"ok": False, "erro": "Acesso negado"}), 403

    inicio = request.args.get("inicio")
    fim    = request.args.get("fim")
    turma  = request.args.get("turma")

    if not inicio or not fim:
        return jsonify({"ok": False, "erro": "Parâmetros inicio e fim são obrigatórios"}), 400

    c = db.get_conn()
    try:
        dados = relatorio_periodo(c, inicio, fim, turma)
    finally:
        c.close()
    return jsonify(dados)


@app.route("/api/relatorio/individual/<int:aluno_id>")
@jwt_required()
def api_relatorio_individual(aluno_id):
    inicio = request.args.get("inicio")
    fim    = request.args.get("fim")

    if not inicio or not fim:
        return jsonify({"ok": False, "erro": "Parâmetros inicio e fim são obrigatórios"}), 400

    # Alunos podem ver seus próprios dados
    claims = get_jwt()
    if claims.get("perfil") != "admin":
        if claims.get("aluno_id") != aluno_id:
            return jsonify({"ok": False, "erro": "Acesso negado"}), 403

    c = db.get_conn()
    try:
        dados = relatorio_individual(c, aluno_id, inicio, fim)
    finally:
        c.close()

    if not dados:
        return jsonify({"ok": False, "erro": "Aluno não encontrado"}), 404
    return jsonify(dados)


@app.route("/api/relatorio/ranking")
@jwt_required()
def api_relatorio_ranking():
    if not _is_admin():
        return jsonify({"ok": False, "erro": "Acesso negado"}), 403

    inicio = request.args.get("inicio")
    fim    = request.args.get("fim")

    if not inicio or not fim:
        return jsonify({"ok": False, "erro": "Parâmetros inicio e fim são obrigatórios"}), 400

    c = db.get_conn()
    try:
        dados = ranking_frequencia(c, inicio, fim)
    finally:
        c.close()
    return jsonify(dados)


@app.route("/api/relatorio/turmas")
@jwt_required()
def api_relatorio_turmas():
    if not _is_admin():
        return jsonify({"ok": False, "erro": "Acesso negado"}), 403

    data = request.args.get("data")
    c = db.get_conn()
    try:
        dados = resumo_por_turma(c, data)
    finally:
        c.close()
    return jsonify(dados)


# ── Exportação PDF/CSV ───────────────────────────────────────────────────

@app.route("/api/relatorio/exportar/pdf")
@jwt_required()
def api_exportar_pdf():
    if not _is_admin():
        return jsonify({"ok": False, "erro": "Acesso negado"}), 403

    data_filtro = request.args.get("data", datetime.now().strftime("%Y-%m-%d"))

    c = db.get_conn()
    try:
        registros   = relatorio_dia(c, data_filtro)
        resumo      = db.resumo_presenca(c, data_filtro)
        faltas      = relatorio_faltas(c, data_filtro)
        ocorrencias = relatorio_atrasos_saidas_antecipadas(c, data_filtro)
    finally:
        c.close()

    pdf_buffer = gerar_pdf_relatorio_dia(
        registros, resumo, faltas,
        ocorrencias["atrasos"], ocorrencias["saidas_antecipadas"],
        data_filtro,
    )

    return Response(
        pdf_buffer.getvalue(),
        mimetype="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=relatorio_{data_filtro}.pdf"
        },
    )


@app.route("/api/relatorio/exportar/csv")
@jwt_required()
def api_exportar_csv():
    if not _is_admin():
        return jsonify({"ok": False, "erro": "Acesso negado"}), 403

    data_filtro = request.args.get("data", datetime.now().strftime("%Y-%m-%d"))

    c = db.get_conn()
    try:
        registros = relatorio_dia(c, data_filtro)
        faltas    = relatorio_faltas(c, data_filtro)
    finally:
        c.close()

    csv_content = gerar_csv_relatorio_dia(registros, faltas)

    return Response(
        csv_content,
        mimetype="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=relatorio_{data_filtro}.csv"
        },
    )


@app.route("/api/relatorio/exportar/periodo/pdf")
@jwt_required()
def api_exportar_periodo_pdf():
    if not _is_admin():
        return jsonify({"ok": False, "erro": "Acesso negado"}), 403

    inicio = request.args.get("inicio")
    fim    = request.args.get("fim")
    turma  = request.args.get("turma")

    if not inicio or not fim:
        return jsonify({"ok": False, "erro": "Parâmetros inicio e fim obrigatórios"}), 400

    c = db.get_conn()
    try:
        dados = relatorio_periodo(c, inicio, fim, turma)
    finally:
        c.close()

    pdf_buffer = gerar_pdf_relatorio_periodo(dados, inicio, fim, turma)

    nome_arquivo = f"relatorio_{inicio}_a_{fim}"
    if turma:
        nome_arquivo += f"_turma_{turma}"

    return Response(
        pdf_buffer.getvalue(),
        mimetype="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={nome_arquivo}.pdf"},
    )


@app.route("/api/relatorio/exportar/periodo/csv")
@jwt_required()
def api_exportar_periodo_csv():
    if not _is_admin():
        return jsonify({"ok": False, "erro": "Acesso negado"}), 403

    inicio = request.args.get("inicio")
    fim    = request.args.get("fim")
    turma  = request.args.get("turma")

    if not inicio or not fim:
        return jsonify({"ok": False, "erro": "Parâmetros inicio e fim obrigatórios"}), 400

    c = db.get_conn()
    try:
        dados = relatorio_periodo(c, inicio, fim, turma)
    finally:
        c.close()

    csv_content = gerar_csv_relatorio_periodo(dados, inicio, fim)

    return Response(
        csv_content,
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename=relatorio_{inicio}_a_{fim}.csv"},
    )


# ═══════════════════════════════════════════════════════════════════════════
#  ROTAS DO PORTAL DO ALUNO (requerem JWT de aluno)
# ═══════════════════════════════════════════════════════════════════════════

@app.route("/api/aluno/meu-perfil")
@jwt_required()
def api_meu_perfil():
    """Retorna dados do aluno vinculado ao usuário logado."""
    claims   = get_jwt()
    aluno_id = claims.get("aluno_id")

    if not aluno_id:
        return jsonify({"ok": False, "erro": "Nenhum aluno vinculado a este usuário"}), 404

    c = db.get_conn()
    try:
        aluno = db.buscar_aluno_por_id(c, aluno_id)
    finally:
        c.close()

    if not aluno:
        return jsonify({"ok": False, "erro": "Aluno não encontrado"}), 404

    a = dict(aluno)
    a.pop("embedding", None)
    return jsonify({"ok": True, "aluno": a})


@app.route("/api/aluno/minhas-presencas")
@jwt_required()
def api_minhas_presencas():
    """Retorna registros do aluno logado, filtrados por período."""
    claims   = get_jwt()
    aluno_id = claims.get("aluno_id")

    if not aluno_id:
        return jsonify({"ok": False, "erro": "Nenhum aluno vinculado"}), 404

    inicio = request.args.get("inicio", datetime.now().strftime("%Y-%m-01"))
    fim    = request.args.get("fim", datetime.now().strftime("%Y-%m-%d"))

    c = db.get_conn()
    try:
        dados = relatorio_individual(c, aluno_id, inicio, fim)
    finally:
        c.close()

    if not dados:
        return jsonify({"ok": False, "erro": "Dados não encontrados"}), 404
    return jsonify(dados)


@app.route("/api/aluno/calendario")
@jwt_required()
def api_calendario():
    """Retorna dias de presença do aluno para o calendário visual."""
    claims   = get_jwt()
    aluno_id = claims.get("aluno_id")

    if not aluno_id:
        return jsonify({"ok": False, "erro": "Nenhum aluno vinculado"}), 404

    ano = int(request.args.get("ano", datetime.now().year))
    mes = int(request.args.get("mes", datetime.now().month))

    c = db.get_conn()
    try:
        dias = presencas_aluno_mes(c, aluno_id, ano, mes)
    finally:
        c.close()

    return jsonify({"ok": True, "dias_presentes": dias, "ano": ano, "mes": mes})


@app.route("/api/aluno/meu-relatorio/pdf")
@jwt_required()
def api_meu_relatorio_pdf():
    """Download do PDF do relatório individual do aluno logado."""
    claims   = get_jwt()
    aluno_id = claims.get("aluno_id")

    if not aluno_id:
        return jsonify({"ok": False, "erro": "Nenhum aluno vinculado"}), 404

    inicio = request.args.get("inicio", datetime.now().strftime("%Y-%m-01"))
    fim    = request.args.get("fim", datetime.now().strftime("%Y-%m-%d"))

    c = db.get_conn()
    try:
        dados = relatorio_individual(c, aluno_id, inicio, fim)
    finally:
        c.close()

    if not dados:
        return jsonify({"ok": False, "erro": "Dados não encontrados"}), 404

    pdf_buffer = gerar_pdf_individual(dados)

    return Response(
        pdf_buffer.getvalue(),
        mimetype="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=meu_relatorio_{inicio}_{fim}.pdf"
        },
    )


# ═══════════════════════════════════════════════════════════════════════════
#  ROTAS DO PORTAL PARA PAIS (acesso aos filhos vinculados)
# ═══════════════════════════════════════════════════════════════════════════


@app.route("/api/parent/me")
@jwt_required()
def api_parent_me():
    """Retorna dados do usuário e lista de filhos vinculados."""
    user_id = int(get_jwt_identity())
    c = db.get_conn()
    try:
        filhos = parent_links_db.listar_filhos(c, user_id)
    finally:
        c.close()

    return jsonify({"ok": True, "usuario_id": user_id, "filhos": filhos})


@app.route("/api/parent/children/<int:aluno_id>/attendance")
@jwt_required()
def api_parent_child_attendance(aluno_id):
    """Retorna relatório individual do filho se o usuário estiver vinculado a ele."""
    user_id = int(get_jwt_identity())

    inicio = request.args.get("inicio", datetime.now().strftime("%Y-%m-01"))
    fim    = request.args.get("fim", datetime.now().strftime("%Y-%m-%d"))

    c = db.get_conn()
    try:
        # Permitir acesso a admins
        if not _is_admin():
            if not parent_links_db.existe_vinculo(c, user_id, aluno_id):
                return jsonify({"ok": False, "erro": "Acesso negado"}), 403

        dados = relatorio_individual(c, aluno_id, inicio, fim)
    finally:
        c.close()

    if not dados:
        return jsonify({"ok": False, "erro": "Dados não encontrados"}), 404
    return jsonify(dados)


# ═══════════════════════════════════════════════════════════════════════════
#  ROTAS ADMIN PARA GERENCIAR VÍNCULOS ENTRE USUÁRIOS E ALUNOS
# ═══════════════════════════════════════════════════════════════════════════


@app.route("/api/admin/parent-links", methods=["GET"]) 
@jwt_required()
def api_admin_list_parent_links():
    if not _is_admin():
        return jsonify({"ok": False, "erro": "Acesso negado"}), 403
    c = db.get_conn()
    try:
        rows = parent_links_db.listar_todos(c)
    finally:
        c.close()
    return jsonify(rows)


@app.route("/api/admin/parent-links", methods=["POST"]) 
@jwt_required()
def api_admin_add_parent_link():
    if not _is_admin():
        return jsonify({"ok": False, "erro": "Acesso negado"}), 403
    data = request.get_json(silent=True) or {}
    usuario_id = data.get("usuario_id")
    aluno_id   = data.get("aluno_id")
    if not usuario_id or not aluno_id:
        return jsonify({"ok": False, "erro": "usuario_id e aluno_id são obrigatórios"}), 400

    c = db.get_conn()
    try:
        # validar existência
        u = buscar_por_id(c, int(usuario_id))
        a = db.buscar_aluno_por_id(c, int(aluno_id))
        if not u:
            return jsonify({"ok": False, "erro": "Usuário não encontrado"}), 404
        if not a:
            return jsonify({"ok": False, "erro": "Aluno não encontrado"}), 404

        parent_links_db.adicionar_vinculo(c, int(usuario_id), int(aluno_id))
    finally:
        c.close()
    return jsonify({"ok": True})


@app.route("/api/admin/parent-links", methods=["DELETE"]) 
@jwt_required()
def api_admin_remove_parent_link():
    if not _is_admin():
        return jsonify({"ok": False, "erro": "Acesso negado"}), 403
    data = request.get_json(silent=True) or {}
    usuario_id = data.get("usuario_id")
    aluno_id   = data.get("aluno_id")
    if not usuario_id or not aluno_id:
        return jsonify({"ok": False, "erro": "usuario_id e aluno_id são obrigatórios"}), 400

    c = db.get_conn()
    try:
        parent_links_db.remover_vinculo(c, int(usuario_id), int(aluno_id))
    finally:
        c.close()
    return jsonify({"ok": True})




if __name__ == "__main__":
    port = int(os.environ.get("PORT", FLASK_PORT))
    app.run(host=FLASK_HOST, port=port, debug=FLASK_DEBUG)

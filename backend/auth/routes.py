"""
Blueprint de autenticação — login, logout, refresh, CRUD de usuários.
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity, get_jwt,
    current_user,
)
from datetime import timedelta

from database import db
from auth.models import (
    buscar_por_email, verificar_senha, buscar_por_id,
    criar_usuario, listar_usuarios, atualizar_usuario,
    alterar_senha, toggle_ativo, deletar_usuario,
    contar_admins, blacklist_token,
)

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

ACCESS_EXPIRES  = timedelta(hours=2)
REFRESH_EXPIRES = timedelta(days=7)


# ── Login / Logout / Refresh ─────────────────────────────────────────────

@auth_bp.route("/login", methods=["POST"])
def login():
    data  = request.get_json(silent=True) or {}
    email = data.get("email", "").strip().lower()
    senha = data.get("senha", "").strip()

    if not email or not senha:
        return jsonify({"ok": False, "erro": "Email e senha são obrigatórios"}), 400

    conn = db.get_conn()
    try:
        usuario = buscar_por_email(conn, email)
    finally:
        conn.close()

    if not usuario or not verificar_senha(usuario, senha):
        return jsonify({"ok": False, "erro": "Credenciais inválidas"}), 401

    if not usuario["ativo"]:
        return jsonify({"ok": False, "erro": "Conta desativada. Contate o administrador."}), 403

    identity = str(usuario["id"])
    additional = {
        "perfil":   usuario["perfil"],
        "aluno_id": usuario["aluno_id"],
        "nome":     usuario["nome"],
        "email":    usuario["email"],
    }

    access_token  = create_access_token(
        identity=identity,
        additional_claims=additional,
        expires_delta=ACCESS_EXPIRES,
    )
    refresh_token = create_refresh_token(
        identity=identity,
        additional_claims=additional,
        expires_delta=REFRESH_EXPIRES,
    )

    return jsonify({
        "ok":            True,
        "access_token":  access_token,
        "refresh_token": refresh_token,
        "usuario": {
            "id":       usuario["id"],
            "nome":     usuario["nome"],
            "email":    usuario["email"],
            "perfil":   usuario["perfil"],
            "aluno_id": usuario["aluno_id"],
        },
    })


@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    identity = get_jwt_identity()
    claims   = get_jwt()

    conn = db.get_conn()
    try:
        usuario = buscar_por_id(conn, int(identity))
    finally:
        conn.close()

    if not usuario or not usuario["ativo"]:
        return jsonify({"ok": False, "erro": "Usuário inativo"}), 403

    additional = {
        "perfil":   claims.get("perfil", usuario["perfil"]),
        "aluno_id": claims.get("aluno_id", usuario.get("aluno_id")),
        "nome":     usuario["nome"],
        "email":    usuario["email"],
    }

    new_token = create_access_token(
        identity=identity,
        additional_claims=additional,
        expires_delta=ACCESS_EXPIRES,
    )
    return jsonify({"ok": True, "access_token": new_token})


@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    jti  = get_jwt()["jti"]
    conn = db.get_conn()
    try:
        blacklist_token(conn, jti)
    finally:
        conn.close()
    return jsonify({"ok": True, "mensagem": "Logout realizado"})


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    claims = get_jwt()
    return jsonify({
        "ok": True,
        "usuario": {
            "id":       int(get_jwt_identity()),
            "nome":     claims.get("nome", ""),
            "email":    claims.get("email", ""),
            "perfil":   claims.get("perfil", ""),
            "aluno_id": claims.get("aluno_id"),
        },
    })


@auth_bp.route("/change-password", methods=["POST"])
@jwt_required()
def change_password():
    data       = request.get_json(silent=True) or {}
    senha_atual = data.get("senha_atual", "").strip()
    nova_senha  = data.get("nova_senha", "").strip()

    if not senha_atual or not nova_senha:
        return jsonify({"ok": False, "erro": "Preencha senha atual e nova senha"}), 400

    if len(nova_senha) < 4:
        return jsonify({"ok": False, "erro": "A nova senha deve ter pelo menos 4 caracteres"}), 400

    usuario_id = int(get_jwt_identity())
    conn = db.get_conn()
    try:
        usuario = buscar_por_email(conn, get_jwt().get("email", ""))
        if not usuario or not verificar_senha(usuario, senha_atual):
            return jsonify({"ok": False, "erro": "Senha atual incorreta"}), 401
        alterar_senha(conn, usuario_id, nova_senha)
    finally:
        conn.close()

    return jsonify({"ok": True, "mensagem": "Senha alterada com sucesso"})


# ── CRUD de usuários (admin only) ────────────────────────────────────────

@auth_bp.route("/usuarios", methods=["GET"])
@jwt_required()
def listar():
    claims = get_jwt()
    if claims.get("perfil") != "admin":
        return jsonify({"ok": False, "erro": "Acesso negado"}), 403

    conn = db.get_conn()
    try:
        rows = listar_usuarios(conn)
    finally:
        conn.close()

    return jsonify([_serializar_usuario(r) for r in rows])


@auth_bp.route("/usuarios", methods=["POST"])
@jwt_required()
def criar():
    claims = get_jwt()
    if claims.get("perfil") != "admin":
        return jsonify({"ok": False, "erro": "Acesso negado"}), 403

    data     = request.get_json(silent=True) or {}
    nome     = data.get("nome", "").strip()
    email    = data.get("email", "").strip().lower()
    senha    = data.get("senha", "").strip()
    perfil   = data.get("perfil", "aluno").strip()
    aluno_id = data.get("aluno_id")

    if not nome or not email or not senha:
        return jsonify({"ok": False, "erro": "Nome, email e senha são obrigatórios"}), 400

    if perfil not in ("admin", "aluno"):
        return jsonify({"ok": False, "erro": "Perfil deve ser 'admin' ou 'aluno'"}), 400

    conn = db.get_conn()
    try:
        existente = buscar_por_email(conn, email)
        if existente:
            return jsonify({"ok": False, "erro": "Email já cadastrado"}), 409

        uid = criar_usuario(conn, nome, email, senha, perfil, aluno_id)
    finally:
        conn.close()

    return jsonify({"ok": True, "usuario_id": uid}), 201


@auth_bp.route("/usuarios/<int:usuario_id>", methods=["PUT"])
@jwt_required()
def atualizar(usuario_id):
    claims = get_jwt()
    if claims.get("perfil") != "admin":
        return jsonify({"ok": False, "erro": "Acesso negado"}), 403

    data     = request.get_json(silent=True) or {}
    nome     = data.get("nome", "").strip()
    perfil   = data.get("perfil", "aluno").strip()
    aluno_id = data.get("aluno_id")

    if not nome:
        return jsonify({"ok": False, "erro": "Nome é obrigatório"}), 400

    conn = db.get_conn()
    try:
        atualizar_usuario(conn, usuario_id, nome, perfil, aluno_id)
    finally:
        conn.close()

    return jsonify({"ok": True})


@auth_bp.route("/usuarios/<int:usuario_id>/reset-senha", methods=["POST"])
@jwt_required()
def reset_senha(usuario_id):
    claims = get_jwt()
    if claims.get("perfil") != "admin":
        return jsonify({"ok": False, "erro": "Acesso negado"}), 403

    data       = request.get_json(silent=True) or {}
    nova_senha = data.get("nova_senha", "").strip()
    if not nova_senha:
        return jsonify({"ok": False, "erro": "Nova senha é obrigatória"}), 400

    conn = db.get_conn()
    try:
        alterar_senha(conn, usuario_id, nova_senha)
    finally:
        conn.close()

    return jsonify({"ok": True, "mensagem": "Senha resetada"})


@auth_bp.route("/usuarios/<int:usuario_id>/toggle", methods=["POST"])
@jwt_required()
def toggle(usuario_id):
    claims = get_jwt()
    if claims.get("perfil") != "admin":
        return jsonify({"ok": False, "erro": "Acesso negado"}), 403

    data  = request.get_json(silent=True) or {}
    ativo = data.get("ativo", True)

    conn = db.get_conn()
    try:
        toggle_ativo(conn, usuario_id, ativo)
    finally:
        conn.close()

    return jsonify({"ok": True})


@auth_bp.route("/usuarios/<int:usuario_id>", methods=["DELETE"])
@jwt_required()
def deletar(usuario_id):
    claims = get_jwt()
    if claims.get("perfil") != "admin":
        return jsonify({"ok": False, "erro": "Acesso negado"}), 403

    # Impedir auto-exclusão
    if int(get_jwt_identity()) == usuario_id:
        return jsonify({"ok": False, "erro": "Não é possível remover a si mesmo"}), 400

    conn = db.get_conn()
    try:
        deletar_usuario(conn, usuario_id)
    finally:
        conn.close()

    return jsonify({"ok": True})


# ── Helpers ──────────────────────────────────────────────────────────────

def _serializar_usuario(row):
    r = dict(row)
    r.pop("senha_hash", None)
    return r

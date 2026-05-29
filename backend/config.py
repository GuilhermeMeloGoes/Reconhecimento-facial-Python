import os

DB_PATH = os.getenv("DB_PATH", os.path.join(os.path.dirname(__file__), "database", "presenca.db"))
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()

# ── Reconhecimento facial ────────────────────────────────────────────────────
LIMIAR_DISTANCIA    = 0.45      # Mais restrito = mais preciso (era 0.50)
FRAMES_CADASTRO     = 60        # Mais frames = embedding mais robusto
DURACAO_CADASTRO_S  = 6
FACE_MODEL          = "hog"     # "cnn" é mais preciso mas exige GPU
COOLDOWN_MINUTOS    = 0
ENABLE_ANTI_SPOOFING = False
MAX_PROCESS_FPS     = 15

# ── Horários da escola (para relatório de atrasos/saídas antecipadas) ────────
HORA_ENTRADA_ESPERADA = "07:30"   # Tolerância: aluno deve chegar até aqui
HORA_SAIDA_ESPERADA   = "17:00"   # Saída antes disso = saída antecipada
TOLERANCIA_MINUTOS    = 15        # Minutos de tolerância no atraso

# ── Flask ───────────────────────────────────────────────────────────────────
FLASK_HOST  = "0.0.0.0"
FLASK_PORT  = 5000
FLASK_DEBUG = False
SECRET_KEY  = os.getenv("SECRET_KEY", "troque-esta-chave-em-producao")

# ── Câmera ───────────────────────────────────────────────────────────────────
CAMERA_INDEX = 0

# ── Wokwi (catraca simulada) ─────────────────────────────────────────────────
WOKWI_SERIAL_URL = "rfc2217://localhost:4000"
ENABLE_WOKWI     = False   # Desativado por padrão

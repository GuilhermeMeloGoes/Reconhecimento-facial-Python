import os

DB_PATH = os.getenv("DB_PATH", os.path.join(os.path.dirname(__file__), "database", "presenca.db"))
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()

LIMIAR_DISTANCIA    = 0.45      
FRAMES_CADASTRO     = 60       
DURACAO_CADASTRO_S  = 6
FACE_MODEL          = "hog"     
COOLDOWN_MINUTOS    = 0
ENABLE_ANTI_SPOOFING = False
MAX_PROCESS_FPS     = 15

HORA_ENTRADA_ESPERADA = "07:30"   
HORA_SAIDA_ESPERADA   = "17:00"   
TOLERANCIA_MINUTOS    = 15        

FLASK_HOST  = "0.0.0.0"
FLASK_PORT  = 5000
FLASK_DEBUG = False
SECRET_KEY  = os.getenv("SECRET_KEY", "troque-esta-chave-em-producao")

CAMERA_INDEX = 0

WOKWI_SERIAL_URL = "rfc2217://localhost:4000"
ENABLE_WOKWI     = False   

import os

DB_PATH = os.getenv("DB_PATH", os.path.join(os.path.dirname(__file__), "database", "presenca.db"))
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()

LIMIAR_DISTANCIA    = 0.50
FRAMES_CADASTRO     = 50     
DURACAO_CADASTRO_S  = 5      
FACE_MODEL          = "hog"
COOLDOWN_MINUTOS    = 0  
ENABLE_ANTI_SPOOFING = False
MAX_PROCESS_FPS     = 10

TB_HOST  = "mqtt.thingsboard.cloud"
TB_PORT  = 1883
TB_TOKEN = os.getenv("TB_TOKEN", os.getenv('TB_TOKEN'))  

FLASK_HOST  = "0.0.0.0"
FLASK_PORT  = 5000
FLASK_DEBUG = False
SECRET_KEY  = os.getenv("SECRET_KEY", "troque-esta-chave-em-producao")

CAMERA_INDEX = 0

WOKWI_SERIAL_URL = "rfc2217://localhost:4000"
ENABLE_WOKWI     = True   

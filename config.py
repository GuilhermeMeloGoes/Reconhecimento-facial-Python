import os

DB_PATH = os.path.join(os.path.dirname(__file__), "database", "presenca.db")

LIMIAR_DISTANCIA    = 0.55  
FRAMES_CADASTRO     = 50     
DURACAO_CADASTRO_S  = 5      
FACE_MODEL          = "hog" 
COOLDOWN_MINUTOS    = 30  

TB_HOST  = "mqtt.thingsboard.cloud"
TB_PORT  = 1883
TB_TOKEN = os.getenv("TB_TOKEN", os.getenv('TB_TOKEN'))  

FLASK_HOST  = "0.0.0.0"
FLASK_PORT  = 5000
FLASK_DEBUG = False
SECRET_KEY  = os.getenv("SECRET_KEY", "troque-esta-chave-em-producao")

CAMERA_INDEX = 0

# Configuração Wokwi Serial (RFC2217)
WOKWI_SERIAL_URL = "rfc2217://localhost:4000"
ENABLE_WOKWI     = True   

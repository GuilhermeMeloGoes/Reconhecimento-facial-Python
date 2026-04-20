import os
import sys
import logging

<<<<<<< HEAD
# Adiciona a pasta backend ao path para que os imports internos funcionem
=======
# Adiciona a pasta backend ao path para que os imports funcionem
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
sys.path.insert(0, BACKEND_DIR)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)

# Importa o app e as configurações do backend
from backend.app import app
from backend.config import FLASK_HOST, FLASK_PORT, FLASK_DEBUG

if __name__ == "__main__":
    print(f"\n--- Iniciando Sistema de Reconhecimento Facial ---")
    print(f"API e Frontend disponíveis em: http://{FLASK_HOST}:{FLASK_PORT}")
    app.run(host=FLASK_HOST, port=FLASK_PORT, debug=FLASK_DEBUG, threaded=True)
import os
import sys
import logging

>>>>>>> 86cdd06d05c26a91ceffc025f1e3e9e8f9b6bd2c
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)

from config import FLASK_HOST, FLASK_PORT, FLASK_DEBUG
from app import app

if __name__ == "__main__":
    print(f"\n--- Iniciando Sistema de Reconhecimento Facial ---")
    print(f"API e Frontend disponíveis em: http://{FLASK_HOST}:{FLASK_PORT}")
    app.run(host=FLASK_HOST, port=FLASK_PORT, debug=FLASK_DEBUG, threaded=True)
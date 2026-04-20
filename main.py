import os
import sys
import logging

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

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)

from config import FLASK_HOST, FLASK_PORT, FLASK_DEBUG
from ui.app import app

if __name__ == "__main__":
    app.run(host=FLASK_HOST, port=FLASK_PORT, debug=FLASK_DEBUG, threaded=True)
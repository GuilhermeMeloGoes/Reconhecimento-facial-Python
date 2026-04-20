import os
import sys
import logging

# Configuração de caminhos para garantir que os módulos do backend sejam encontrados
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")

if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)

# Importa o app e as configurações agora que o path foi ajustado
from config import FLASK_HOST, FLASK_PORT, FLASK_DEBUG
from app import app

if __name__ == "__main__":
    print(f"\n--- Iniciando Sistema de Reconhecimento Facial ---")
    print(f"API e Frontend disponíveis em: http://{FLASK_HOST}:{FLASK_PORT}")
    # Nota: threaded=True permite lidar com múltiplas requisições (útil para camera + dashboard)
    app.run(host=FLASK_HOST, port=FLASK_PORT, debug=FLASK_DEBUG, threaded=True)

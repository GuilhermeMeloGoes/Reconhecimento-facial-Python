import cv2
import numpy as np
import face_recognition
import base64
from config import FACE_MODEL


def processar_imagem_base64(imagem_b64):
    """
    Extrai embedding facial de uma imagem base64 enviada pelo cliente (celular).
    Retorna (embedding, foto_b64) ou (None, None) se nenhum rosto for detectado.
    """
    if "," in imagem_b64:
        imagem_b64 = imagem_b64.split(",")[1]
    try:
        img_bytes = base64.b64decode(imagem_b64)
    except Exception:
        return None, None

    img_array = np.frombuffer(img_bytes, dtype=np.uint8)
    frame = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    if frame is None:
        return None, None

    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    locais = face_recognition.face_locations(rgb, number_of_times_to_upsample=1, model=FACE_MODEL)
    if not locais:
        locais = face_recognition.face_locations(rgb, number_of_times_to_upsample=0, model=FACE_MODEL)
    if not locais:
        print("[CADASTRO-MOBILE] Nenhum rosto detectado na imagem enviada")
        return None, None

    encs = face_recognition.face_encodings(rgb, locais, num_jitters=3, model="large")
    if not encs:
        return None, None

    _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
    foto_b64 = base64.b64encode(buf).decode("utf-8")
    print(f"[CADASTRO-MOBILE] Embedding extraído com sucesso ({len(encs[0])} dims)")
    return encs[0], foto_b64

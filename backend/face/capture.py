import cv2
import numpy as np
import face_recognition
import base64
import time
from config import FRAMES_CADASTRO, DURACAO_CADASTRO_S, FACE_MODEL, CAMERA_INDEX


def capturar_embedding_cadastro():
    cap = cv2.VideoCapture(CAMERA_INDEX)
    if not cap.isOpened():
        return None, None

    embeddings = []
    melhor_frame = None
    melhor_frame_idx = 0
    inicio = time.time()
    fps_alvo = FRAMES_CADASTRO / DURACAO_CADASTRO_S  # ~10 fps

    while len(embeddings) < FRAMES_CADASTRO:
        tempo_decorrido = time.time() - inicio
        if tempo_decorrido > DURACAO_CADASTRO_S + 2:
            break  

        ret, frame = cap.read()
        if not ret:
            break

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        locais = face_recognition.face_locations(rgb, model=FACE_MODEL)

        if locais:
            encs = face_recognition.face_encodings(rgb, locais)
            if encs:
                embeddings.append(encs[0])
                if melhor_frame is None or len(embeddings) == FRAMES_CADASTRO // 2:
                    melhor_frame = frame.copy()

        time.sleep(1.0 / fps_alvo)

    cap.release()

    if len(embeddings) < 10:
        return None, None

    embedding_medio = np.mean(embeddings, axis=0)

    foto_b64 = None
    if melhor_frame is not None:
        _, buf = cv2.imencode(".jpg", melhor_frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
        foto_b64 = base64.b64encode(buf).decode("utf-8")

    return embedding_medio, foto_b64


def gerar_frame_reconhecimento():
    cap = cv2.VideoCapture(CAMERA_INDEX)
    if not cap.isOpened():
        return

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" +
                buf.tobytes() +
                b"\r\n"
            )
    finally:
        cap.release()

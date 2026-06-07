import cv2
import numpy as np
import face_recognition
from config import LIMIAR_DISTANCIA, FACE_MODEL


def identificar_frame_rgb(rgb, alunos_db, upsample=1):
    """
    Identifica rostos em um frame RGB (numpy array HxWx3).
    Aceita diretamente o array RGB — sem conversão de cor necessária.
    Retorna lista de dicionários com os rostos identificados.
    """
    if not alunos_db:
        return []

    locais = face_recognition.face_locations(
        rgb,
        number_of_times_to_upsample=upsample,
        model=FACE_MODEL
    )

    if not locais:
        locais = face_recognition.face_locations(
            rgb,
            number_of_times_to_upsample=0,
            model=FACE_MODEL
        )

    if not locais:
        return []

    encodings = face_recognition.face_encodings(rgb, locais, num_jitters=1, model="large")

    conhecidos = [a[4] for a in alunos_db]
    resultados = []

    for enc, box in zip(encodings, locais):
        distancias = face_recognition.face_distance(conhecidos, enc)
        idx = int(np.argmin(distancias))
        dist_min = float(distancias[idx])

        if dist_min <= LIMIAR_DISTANCIA:
            confianca = max(0, int((1 - dist_min) * 100))
            resultados.append({
                "aluno_id":  alunos_db[idx][0],
                "nome":      alunos_db[idx][1],
                "matricula": alunos_db[idx][2],
                "turma":     alunos_db[idx][3],
                "distancia": dist_min,
                "confianca": confianca,
                "box":       box,
            })
        else:
            resultados.append({
                "aluno_id":  None,
                "nome":      "Desconhecido",
                "matricula": "",
                "turma":     "",
                "distancia": dist_min,
                "confianca": 0,
                "box":       box,
            })

    return resultados


def identificar_frame(frame_bgr, alunos_db, upsample=1):
    """
    Identifica rostos em um frame BGR (formato OpenCV).
    Converte para RGB e chama identificar_frame_rgb.
    """
    rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    return identificar_frame_rgb(rgb, alunos_db, upsample)


def anotar_frame(frame_bgr, resultados):
    """Desenha caixas e labels no frame com indicador de confiança colorido."""
    frame = frame_bgr.copy()
    for r in resultados:
        top, right, bottom, left = r["box"]
        confianca = r.get("confianca", 0)
        nome = r["nome"]

        if nome == "Desconhecido":
            cor = (0, 60, 220)
        elif confianca >= 80:
            cor = (0, 200, 100)
        elif confianca >= 60:
            cor = (0, 200, 220)
        else:
            cor = (0, 100, 200)

        label = f"{nome} ({confianca}%)" if nome != "Desconhecido" else "Desconhecido"

        cv2.rectangle(frame, (left, top), (right, bottom), cor, 2)

        label_h = 28
        cv2.rectangle(frame, (left, bottom - label_h), (right, bottom), cor, cv2.FILLED)
        cv2.putText(frame, label, (left + 5, bottom - 8),
                    cv2.FONT_HERSHEY_DUPLEX, 0.5, (15, 15, 15), 1)

        if nome != "Desconhecido":
            bar_w = right - left
            filled = int(bar_w * confianca / 100)
            cv2.rectangle(frame, (left, top - 6), (right, top - 2), (50, 50, 50), cv2.FILLED)
            cv2.rectangle(frame, (left, top - 6), (left + filled, top - 2), cor, cv2.FILLED)

    return frame

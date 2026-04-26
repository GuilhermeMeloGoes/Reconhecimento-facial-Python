import cv2
import numpy as np
import face_recognition
from config import LIMIAR_DISTANCIA, FACE_MODEL


def identificar_frame(frame_bgr, alunos_db, upsample=1):
    if not alunos_db:
        return []

    rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)

    locais = face_recognition.face_locations(rgb, number_of_times_to_upsample=0, model=FACE_MODEL)

    if not locais:
        return []

    encodings = face_recognition.face_encodings(rgb, locais, model="small")

    conhecidos = [a[4] for a in alunos_db]
    resultados = []

    for enc, box in zip(encodings, locais):
        distancias = face_recognition.face_distance(conhecidos, enc)
        idx = int(np.argmin(distancias))

        if distancias[idx] <= LIMIAR_DISTANCIA:
            _, nome, matricula, turma, _ = alunos_db[idx]
            resultados.append({
                "aluno_id":  alunos_db[idx][0],
                "nome":      nome,
                "matricula": matricula,
                "turma":     turma,
                "distancia": float(distancias[idx]),
                "box":       box,
            })

    return resultados


def anotar_frame(frame_bgr, resultados):
    frame = frame_bgr.copy()
    for r in resultados:
        top, right, bottom, left = r["box"]
        confianca = int((1 - r["distancia"]) * 100)
        label = f"{r['nome']} ({confianca}%)"

        cv2.rectangle(frame, (left, top), (right, bottom), (0, 200, 100), 2)
        cv2.rectangle(frame, (left, bottom - 28), (right, bottom), (0, 200, 100), cv2.FILLED)
        cv2.putText(frame, label, (left + 6, bottom - 8),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (20, 20, 20), 1)
    return frame

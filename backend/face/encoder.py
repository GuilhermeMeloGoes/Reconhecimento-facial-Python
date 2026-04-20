import face_recognition
import numpy as np
import cv2

def capturar_embeddings(duracao_segundos=5, fps_alvo=10):
    cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
    if not cap.isOpened():
        cap.release()
        return []
    embeddings = []
    frames_necessarios = duracao_segundos * fps_alvo

    while len(embeddings) < frames_necessarios:
        ret, frame = cap.read()
        if not ret:
            break

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        locais = face_recognition.face_locations(rgb, model="hog")
        
        if locais:
            enc = face_recognition.face_encodings(rgb, locais)[0]
            embeddings.append(enc)
            cv2.putText(frame, f"Capturado: {len(embeddings)}/{frames_necessarios}",
                       (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,255,0), 2)
        
        cv2.imshow("Cadastro - olhe para a camera", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()
    
    if embeddings:
        return np.mean(embeddings, axis=0)
    return None
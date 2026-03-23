import json
import threading
import time
import logging
import requests
from datetime import datetime
 
from database import db
 
logger = logging.getLogger(__name__)
 
# Carrega config
import sys, os
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)
 
from config import TB_TOKEN
 
TB_URL = f"https://thingsboard.cloud/api/v1/{TB_TOKEN}/telemetry"
TB_ATTR = f"https://thingsboard.cloud/api/v1/{TB_TOKEN}/attributes"
 
 
class ThingsBoardClient:
    def __init__(self, conn):
        self.conn       = conn
        self._conectado = False
        self._testar_conexao()
 
        # Thread de reenvio de pendentes
        t = threading.Thread(target=self._reenvio_loop, daemon=True)
        t.start()
 
    def _testar_conexao(self):
        try:
            r = requests.post(TB_ATTR,
                json={"status": "online", "versao": "1.0"},
                timeout=5)
            if r.status_code == 200:
                self._conectado = True
                logger.info("[TB] Conectado ao ThingsBoard via REST")
            else:
                logger.warning(f"[TB] Falha REST, status: {r.status_code} — verifique o TB_TOKEN")
        except Exception as e:
            logger.warning(f"[TB] Sem conexão com ThingsBoard: {e}")
 
    def _publicar(self, payload: dict, url: str = None) -> bool:
        dest = url or TB_URL
        try:
            r = requests.post(dest, json=payload, timeout=5)
            self._conectado = r.status_code == 200
            return self._conectado
        except Exception as e:
            self._conectado = False
            logger.error(f"[TB] Erro ao publicar: {e}")
            return False
 
    def _enviar_atributos(self, atributos: dict):
        self._publicar(atributos, TB_ATTR)
 
    def enviar_evento_presenca(self, registro: dict) -> bool:
        ts = int(datetime.fromisoformat(registro["timestamp"]).timestamp() * 1000)
        payload = {
            "ts": ts,
            "values": {
                "aluno_nome":  registro["nome"],
                "matricula":   registro["matricula"],
                "turma":       registro.get("turma", ""),
                "evento":      registro["tipo"],
                "timestamp":   registro["timestamp"],
            }
        }
        enviado = self._publicar(payload)
        if enviado and "id" in registro:
            db.marcar_enviado(self.conn, registro["id"])
            logger.info(f"[TB] Enviado: {registro['nome']} → {registro['tipo']}")
        return enviado
 
    def enviar_resumo(self, resumo: dict):
        self._publicar({
            "presentes": resumo["presentes"],
            "ausentes":  resumo["ausentes"],
            "total":     resumo["total"],
        })
 
    def _reenvio_loop(self):
        while True:
            time.sleep(60)
            if not self._conectado:
                self._testar_conexao()
                continue
            try:
                pendentes = db.registros_nao_enviados(self.conn)
                for r in pendentes:
                    self.enviar_evento_presenca(dict(r))
            except Exception as e:
                logger.error(f"[TB] Erro no reenvio: {e}")
 
    @property
    def conectado(self):
        return self._conectado
 
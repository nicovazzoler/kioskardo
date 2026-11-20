import asyncio
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from pydantic import ValidationError

from app.kiosko import SesionDep, obtener_kiosko_id
from app.sesion import sesion_valida
from app.vivo import Hola, salas

router = APIRouter(tags=["vivo"])

ESPERA_HOLA_SEGUNDOS = 10
# 4000-4999 son códigos libres para cada aplicación: este imita al 401 de HTTP.
CIERRE_SIN_SESION = 4401


def kiosko_de_la_sala(sesion: SesionDep) -> uuid.UUID:
    kiosko_id = obtener_kiosko_id(sesion)
    # La sesión dura lo que el WebSocket (horas): sin el commit retiene una transacción abierta.
    sesion.commit()
    return kiosko_id


@router.websocket("/api/vivo")
async def vivo(websocket: WebSocket, kiosko_id: Annotated[uuid.UUID, Depends(kiosko_de_la_sala)]):
    await websocket.accept()
    try:
        hola = await _esperar_hola(websocket)
        if hola is None:
            await websocket.close(1008, "El primer mensaje tiene que ser hola")
            return
        if not sesion_valida(hola.token):
            await websocket.close(CIERRE_SIN_SESION, "Hay que ingresar la clave del kiosco")
            return

        sala = salas[kiosko_id]
        await sala.entrar(websocket, hola.rol)
        try:
            while True:
                await sala.recibir(websocket, await websocket.receive_text())
        finally:
            await sala.salir(websocket)
    except WebSocketDisconnect:
        pass


# El token viaja en este mensaje porque el navegador no deja mandar headers al abrir un
# WebSocket, y en la URL quedaría escrito en los logs del servidor.
async def _esperar_hola(websocket: WebSocket) -> Hola | None:
    try:
        texto = await asyncio.wait_for(websocket.receive_text(), ESPERA_HOLA_SEGUNDOS)
        return Hola.model_validate_json(texto)
    except (TimeoutError, ValidationError):
        return None

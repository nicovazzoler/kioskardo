import time

from fastapi import APIRouter, HTTPException

from app.config import config
from app.esquemas import SesionCrear, SesionLeer
from app.sesion import clave_correcta, crear_token

router = APIRouter(prefix="/api/sesion", tags=["sesion"])


@router.post("")
def ingresar(datos: SesionCrear) -> SesionLeer:
    if config.clave_acceso is None:
        raise HTTPException(404, "Este servidor no tiene clave")
    if not clave_correcta(datos.clave):
        # Frena a quien quiera probar claves de a miles.
        time.sleep(1)
        raise HTTPException(401, "Clave incorrecta")
    return SesionLeer(token=crear_token())

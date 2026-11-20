"""Una sola clave por kiosco (CLAVE_ACCESO). Los tokens se firman con esa misma clave, así que
cambiarla cierra la sesión en todos los dispositivos.
"""

import base64
import binascii
import hashlib
import hmac
import json
import time
from typing import Annotated

from fastapi import Header, HTTPException

from app.config import config

# Larga a propósito: la app tiene que seguir vendiendo días enteros sin conexión.
DURACION_SEGUNDOS = 90 * 24 * 3600


def _firmar(datos: str) -> str:
    return hmac.new(config.clave_acceso.encode(), datos.encode(), hashlib.sha256).hexdigest()


def crear_token() -> str:
    vence = int(time.time()) + DURACION_SEGUNDOS
    datos = base64.urlsafe_b64encode(json.dumps({"vence": vence}).encode()).decode()
    return f"{datos}.{_firmar(datos)}"


def token_valido(token: str) -> bool:
    try:
        datos, firma = token.split(".")
        if not hmac.compare_digest(firma, _firmar(datos)):
            return False
        return json.loads(base64.urlsafe_b64decode(datos))["vence"] > time.time()
    except (ValueError, KeyError, binascii.Error):
        return False


def clave_correcta(clave: str) -> bool:
    return hmac.compare_digest(clave.encode(), config.clave_acceso.encode())


def sesion_valida(token: str | None) -> bool:
    return config.clave_acceso is None or token_valido(token or "")


def exigir_sesion(authorization: Annotated[str | None, Header()] = None) -> None:
    if not sesion_valida((authorization or "").removeprefix("Bearer ")):
        raise HTTPException(401, "Hay que ingresar la clave del kiosco")

import uuid
from typing import Annotated

from fastapi import Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import obtener_sesion
from app.modelos import Kiosko

SesionDep = Annotated[Session, Depends(obtener_sesion)]


def obtener_kiosko_id(sesion: SesionDep) -> uuid.UUID:
    """Por ahora hay un solo kiosko. Cuando haya varios, sale del usuario logueado."""
    kiosko_id = sesion.scalar(select(Kiosko.id).limit(1))
    if kiosko_id is None:
        raise HTTPException(500, "No hay ningún kiosko creado. Correr: python -m app.semilla")
    return kiosko_id


KioskoIdDep = Annotated[uuid.UUID, Depends(obtener_kiosko_id)]

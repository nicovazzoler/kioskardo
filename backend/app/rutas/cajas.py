import uuid

from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.esquemas import CajaAbrir, CajaLeer
from app.kiosko import KioskoIdDep, SesionDep
from app.modelos import Caja

router = APIRouter(prefix="/api/cajas", tags=["cajas"])


@router.get("/abierta")
def caja_abierta(sesion: SesionDep, kiosko_id: KioskoIdDep) -> CajaLeer | None:
    return sesion.scalar(select(Caja).where(Caja.kiosko_id == kiosko_id, Caja.cerrada_en.is_(None)))


@router.put("/{caja_id}")
def abrir_caja(
    caja_id: uuid.UUID, datos: CajaAbrir, sesion: SesionDep, kiosko_id: KioskoIdDep
) -> CajaLeer:
    existente = sesion.get(Caja, caja_id)
    if existente is not None:
        if existente.kiosko_id != kiosko_id:
            raise HTTPException(404, "Caja no encontrada")
        return existente

    caja = Caja(id=caja_id, kiosko_id=kiosko_id, monto_inicial=datos.monto_inicial)
    if datos.abierta_en is not None:
        caja.abierta_en = datos.abierta_en
    sesion.add(caja)
    try:
        sesion.commit()
    except IntegrityError as error:
        sesion.rollback()
        raise HTTPException(409, "Ya hay una caja abierta") from error
    sesion.refresh(caja)
    return caja

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.esquemas import (
    CajaAbrir,
    CajaCerrar,
    CajaConResumen,
    CajaLeer,
    MovimientoCajaCrear,
    MovimientoCajaLeer,
    VentaLeer,
)
from app.kiosko import KioskoIdDep, SesionDep
from app.modelos import Caja, MovimientoCaja, Venta
from app.resumen import calcular_resumen

router = APIRouter(prefix="/api/cajas", tags=["cajas"])


def buscar_caja(sesion: Session, kiosko_id: uuid.UUID, caja_id: uuid.UUID) -> Caja:
    caja = sesion.get(Caja, caja_id)
    if caja is None or caja.kiosko_id != kiosko_id:
        raise HTTPException(404, "Caja no encontrada")
    return caja


def con_resumen(sesion: Session, caja: Caja) -> CajaConResumen:
    datos = CajaLeer.model_validate(caja).model_dump()
    return CajaConResumen(**datos, resumen=calcular_resumen(sesion, caja))


@router.get("/abierta")
def caja_abierta(sesion: SesionDep, kiosko_id: KioskoIdDep) -> CajaLeer | None:
    return sesion.scalar(select(Caja).where(Caja.kiosko_id == kiosko_id, Caja.cerrada_en.is_(None)))


@router.get("")
def historial_cierres(
    sesion: SesionDep, kiosko_id: KioskoIdDep, limite: int = Query(30, le=100)
) -> list[CajaConResumen]:
    """Las últimas cajas cerradas, de la más nueva a la más vieja."""
    cajas = sesion.scalars(
        select(Caja)
        .where(Caja.kiosko_id == kiosko_id, Caja.cerrada_en.is_not(None))
        .order_by(Caja.cerrada_en.desc())
        .limit(limite)
    )
    return [con_resumen(sesion, caja) for caja in cajas]


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


@router.get("/{caja_id}")
def detalle_caja(caja_id: uuid.UUID, sesion: SesionDep, kiosko_id: KioskoIdDep) -> CajaConResumen:
    return con_resumen(sesion, buscar_caja(sesion, kiosko_id, caja_id))


@router.post("/{caja_id}/cerrar")
def cerrar_caja(
    caja_id: uuid.UUID, datos: CajaCerrar, sesion: SesionDep, kiosko_id: KioskoIdDep
) -> CajaConResumen:
    caja = buscar_caja(sesion, kiosko_id, caja_id)
    # Si ya estaba cerrada es un reintento: se devuelve como quedó, sin pisar el arqueo.
    if caja.cerrada_en is None:
        caja.cerrada_en = datos.cerrada_en or datetime.now(UTC)
        caja.monto_contado = datos.monto_contado
        caja.nota = datos.nota
        sesion.commit()
    return con_resumen(sesion, caja)


@router.get("/{caja_id}/ventas")
def ventas_de_caja(
    caja_id: uuid.UUID, sesion: SesionDep, kiosko_id: KioskoIdDep
) -> list[VentaLeer]:
    caja = buscar_caja(sesion, kiosko_id, caja_id)
    return list(
        sesion.scalars(
            select(Venta).where(Venta.caja_id == caja.id).order_by(Venta.creado_en.desc())
        )
    )


@router.get("/{caja_id}/movimientos")
def movimientos_de_caja(
    caja_id: uuid.UUID, sesion: SesionDep, kiosko_id: KioskoIdDep
) -> list[MovimientoCajaLeer]:
    caja = buscar_caja(sesion, kiosko_id, caja_id)
    return list(
        sesion.scalars(
            select(MovimientoCaja)
            .where(MovimientoCaja.caja_id == caja.id)
            .order_by(MovimientoCaja.creado_en.desc())
        )
    )


@router.post("/{caja_id}/movimientos")
def registrar_movimiento(
    caja_id: uuid.UUID, datos: MovimientoCajaCrear, sesion: SesionDep, kiosko_id: KioskoIdDep
) -> MovimientoCajaLeer:
    """Ingreso o egreso de efectivo que no es una venta. Reenviar el mismo id no lo duplica."""
    caja = buscar_caja(sesion, kiosko_id, caja_id)
    existente = sesion.get(MovimientoCaja, datos.id)
    if existente is not None:
        return existente

    movimiento = MovimientoCaja(**datos.model_dump(), caja_id=caja.id, kiosko_id=kiosko_id)
    sesion.add(movimiento)
    sesion.commit()
    return movimiento

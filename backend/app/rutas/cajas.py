import uuid
from datetime import UTC, datetime
from typing import Annotated

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
    PresenciaGuardar,
    PresenciaLeer,
    VentaLeer,
)
from app.kiosko import KioskoIdDep, SesionDep
from app.modelos import Caja, Empleado, MovimientoCaja, Presencia, Venta
from app.resumen import calcular_resumen

router = APIRouter(prefix="/api/cajas", tags=["cajas"])


def buscar_caja(sesion: Session, kiosko_id: uuid.UUID, caja_id: uuid.UUID) -> Caja:
    caja = sesion.get(Caja, caja_id)
    if caja is None or caja.kiosko_id != kiosko_id:
        raise HTTPException(404, "Caja no encontrada")
    return caja


def presencias_de(sesion: Session, caja: Caja) -> list[Presencia]:
    return list(
        sesion.scalars(
            select(Presencia).where(Presencia.caja_id == caja.id).order_by(Presencia.entrada)
        )
    )


def con_resumen(sesion: Session, caja: Caja) -> CajaConResumen:
    datos = CajaLeer.model_validate(caja).model_dump()
    presencias = [PresenciaLeer.model_validate(p) for p in presencias_de(sesion, caja)]
    return CajaConResumen(**datos, resumen=calcular_resumen(sesion, caja), presencias=presencias)


@router.get("/abierta")
def caja_abierta(sesion: SesionDep, kiosko_id: KioskoIdDep) -> CajaLeer | None:
    return sesion.scalar(select(Caja).where(Caja.kiosko_id == kiosko_id, Caja.cerrada_en.is_(None)))


@router.get("")
def historial_turnos(
    sesion: SesionDep,
    kiosko_id: KioskoIdDep,
    desde: Annotated[datetime | None, Query()] = None,
    hasta: Annotated[datetime | None, Query()] = None,
    limite: Annotated[int, Query(le=500)] = 100,
) -> list[CajaConResumen]:
    """Los turnos que empezaron entre `desde` y `hasta` (sin incluirlo), el abierto también.
    Del más nuevo al más viejo.
    """
    consulta = select(Caja).where(Caja.kiosko_id == kiosko_id)
    if desde is not None:
        consulta = consulta.where(Caja.abierta_en >= desde)
    if hasta is not None:
        consulta = consulta.where(Caja.abierta_en < hasta)
    cajas = sesion.scalars(consulta.order_by(Caja.abierta_en.desc()).limit(limite))
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
        for presencia in presencias_de(sesion, caja):
            if presencia.salida is None:
                presencia.salida = max(caja.cerrada_en, presencia.entrada)
        sesion.commit()
    return con_resumen(sesion, caja)


@router.get("/{caja_id}/presencias")
def presencias_de_caja(
    caja_id: uuid.UUID, sesion: SesionDep, kiosko_id: KioskoIdDep
) -> list[PresenciaLeer]:
    return presencias_de(sesion, buscar_caja(sesion, kiosko_id, caja_id))


@router.put("/{caja_id}/presencias/{presencia_id}")
def guardar_presencia(
    caja_id: uuid.UUID,
    presencia_id: uuid.UUID,
    datos: PresenciaGuardar,
    sesion: SesionDep,
    kiosko_id: KioskoIdDep,
) -> PresenciaLeer:
    """Entrada al turno y, después, la salida: es el mismo PUT con `salida` completa."""
    caja = buscar_caja(sesion, kiosko_id, caja_id)
    empleado = sesion.get(Empleado, datos.empleado_id)
    if empleado is None or empleado.kiosko_id != kiosko_id:
        raise HTTPException(404, "Empleado no encontrado")

    presencia = sesion.get(Presencia, presencia_id)
    if presencia is None:
        presencia = Presencia(id=presencia_id, kiosko_id=kiosko_id, caja_id=caja.id)
        sesion.add(presencia)
    elif presencia.caja_id != caja.id:
        raise HTTPException(404, "Presencia no encontrada")
    presencia.empleado_id = datos.empleado_id
    presencia.entrada = datos.entrada
    presencia.salida = datos.salida
    sesion.commit()
    return presencia


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

import uuid

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.esquemas import EmpleadoGuardar, EmpleadoLeer
from app.kiosko import KioskoIdDep, SesionDep
from app.modelos import Empleado

router = APIRouter(prefix="/api/empleados", tags=["empleados"])


@router.get("")
def listar_empleados(sesion: SesionDep, kiosko_id: KioskoIdDep) -> list[EmpleadoLeer]:
    """Incluye los dados de baja: hacen falta para mostrar sus horas en el historial."""
    return list(
        sesion.scalars(
            select(Empleado).where(Empleado.kiosko_id == kiosko_id).order_by(Empleado.nombre)
        )
    )


@router.put("/{empleado_id}")
def guardar_empleado(
    empleado_id: uuid.UUID, datos: EmpleadoGuardar, sesion: SesionDep, kiosko_id: KioskoIdDep
) -> EmpleadoLeer:
    empleado = sesion.get(Empleado, empleado_id)
    if empleado is None:
        empleado = Empleado(id=empleado_id, kiosko_id=kiosko_id)
        sesion.add(empleado)
    elif empleado.kiosko_id != kiosko_id:
        raise HTTPException(404, "Empleado no encontrado")
    empleado.nombre = datos.nombre
    empleado.activo = datos.activo
    sesion.commit()
    return empleado

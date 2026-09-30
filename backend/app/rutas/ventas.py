import uuid

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.esquemas import VentaCrear, VentaLeer
from app.kiosko import KioskoIdDep, SesionDep
from app.modelos import (
    Caja,
    MotivoStock,
    MovimientoStock,
    Producto,
    Venta,
    VentaItem,
    VentaPago,
)

router = APIRouter(prefix="/api/ventas", tags=["ventas"])


@router.put("/{venta_id}")
def registrar_venta(
    venta_id: uuid.UUID, datos: VentaCrear, sesion: SesionDep, kiosko_id: KioskoIdDep
) -> VentaLeer:
    """Registra la venta y descuenta el stock. Reenviar la misma venta devuelve la ya guardada."""
    existente = sesion.get(Venta, venta_id)
    if existente is not None:
        if existente.kiosko_id != kiosko_id:
            raise HTTPException(404, "Venta no encontrada")
        return existente

    # No se exige que la caja siga abierta: una venta offline puede llegar después del cierre.
    caja = sesion.get(Caja, datos.caja_id)
    if caja is None or caja.kiosko_id != kiosko_id:
        raise HTTPException(422, "La caja de la venta no existe")

    ids_productos = {item.producto_id for item in datos.items if item.producto_id}
    encontrados = set(
        sesion.scalars(
            select(Producto.id).where(
                Producto.id.in_(ids_productos), Producto.kiosko_id == kiosko_id
            )
        )
    )
    if faltantes := ids_productos - encontrados:
        raise HTTPException(422, f"Productos inexistentes: {', '.join(map(str, faltantes))}")

    venta = Venta(
        id=venta_id,
        kiosko_id=kiosko_id,
        caja_id=caja.id,
        total=datos.total,
        creado_en=datos.creado_en,
        items=[VentaItem(**item.model_dump()) for item in datos.items],
        pagos=[VentaPago(**pago.model_dump()) for pago in datos.pagos],
    )
    sesion.add(venta)
    # MovimientoStock no tiene relationship con Venta, así que SQLAlchemy no sabe que la venta
    # tiene que insertarse primero: el flush la manda a la base antes que los movimientos.
    sesion.flush()
    # El stock puede quedar negativo: es preferible vender aunque el inventario no esté al día.
    for item in datos.items:
        if item.producto_id:
            sesion.add(
                MovimientoStock(
                    kiosko_id=kiosko_id,
                    producto_id=item.producto_id,
                    cantidad=-item.cantidad,
                    motivo=MotivoStock.VENTA,
                    venta_id=venta_id,
                )
            )
    sesion.commit()
    sesion.refresh(venta)
    return venta

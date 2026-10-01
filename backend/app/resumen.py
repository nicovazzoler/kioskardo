from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.esquemas import ResumenCaja
from app.modelos import Caja, MedioPago, MovimientoCaja, TipoMovimientoCaja, Venta, VentaPago


def calcular_resumen(sesion: Session, caja: Caja) -> ResumenCaja:
    """Totales de una caja. Las ventas anuladas no cuentan.

    El frontend hace la misma cuenta con sus datos locales (frontend/src/lib/resumenCaja.ts)
    para mostrarla sin conexión: si cambia una, hay que cambiar la otra.
    """
    cantidad, total = sesion.execute(
        select(func.count(), func.coalesce(func.sum(Venta.total), 0)).where(
            Venta.caja_id == caja.id, Venta.anulada.is_(False)
        )
    ).one()

    por_medio = {medio: 0 for medio in MedioPago}
    filas = sesion.execute(
        select(VentaPago.medio, func.sum(VentaPago.monto))
        .join(Venta)
        .where(Venta.caja_id == caja.id, Venta.anulada.is_(False))
        .group_by(VentaPago.medio)
    )
    for medio, monto in filas:
        por_medio[medio] = monto

    movimientos = {tipo: 0 for tipo in TipoMovimientoCaja}
    filas = sesion.execute(
        select(MovimientoCaja.tipo, func.sum(MovimientoCaja.monto))
        .where(MovimientoCaja.caja_id == caja.id)
        .group_by(MovimientoCaja.tipo)
    )
    for tipo, monto in filas:
        movimientos[tipo] = monto

    ingresos = movimientos[TipoMovimientoCaja.INGRESO]
    egresos = movimientos[TipoMovimientoCaja.EGRESO]
    return ResumenCaja(
        cantidad_ventas=cantidad,
        total_ventas=total,
        por_medio=por_medio,
        ingresos=ingresos,
        egresos=egresos,
        efectivo_esperado=caja.monto_inicial + por_medio[MedioPago.EFECTIVO] + ingresos - egresos,
    )

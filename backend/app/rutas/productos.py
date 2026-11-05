import uuid
from decimal import Decimal

from fastapi import APIRouter, HTTPException
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.esquemas import MovimientoStockCrear, ProductoGuardar, ProductoLeer
from app.kiosko import KioskoIdDep, SesionDep
from app.modelos import MotivoStock, MovimientoStock, Producto, Unidad

router = APIRouter(prefix="/api/productos", tags=["productos"])


def calcular_stock(sesion: Session, producto_id: uuid.UUID) -> Decimal:
    return sesion.scalar(
        select(func.coalesce(func.sum(MovimientoStock.cantidad), 0)).where(
            MovimientoStock.producto_id == producto_id
        )
    )


def a_lectura(producto: Producto, stock: Decimal) -> ProductoLeer:
    campos = {
        campo: getattr(producto, campo) for campo in ProductoLeer.model_fields if campo != "stock"
    }
    return ProductoLeer(**campos, stock=stock)


def buscar_producto(sesion: Session, kiosko_id: uuid.UUID, producto_id: uuid.UUID) -> Producto:
    producto = sesion.get(Producto, producto_id)
    if producto is None or producto.kiosko_id != kiosko_id:
        raise HTTPException(404, "Producto no encontrado")
    return producto


@router.get("")
def listar_productos(sesion: SesionDep, kiosko_id: KioskoIdDep) -> list[ProductoLeer]:
    stock = func.coalesce(func.sum(MovimientoStock.cantidad), 0)
    filas = sesion.execute(
        select(Producto, stock)
        .outerjoin(MovimientoStock, MovimientoStock.producto_id == Producto.id)
        .where(Producto.kiosko_id == kiosko_id)
        .group_by(Producto.id)
        .order_by(Producto.nombre)
    ).all()
    return [a_lectura(producto, stock) for producto, stock in filas]


@router.put("/{producto_id}")
def guardar_producto(
    producto_id: uuid.UUID, datos: ProductoGuardar, sesion: SesionDep, kiosko_id: KioskoIdDep
) -> ProductoLeer:
    """Crea o actualiza. El id lo genera el cliente, así que reenviar la misma request es seguro."""
    producto = sesion.get(Producto, producto_id)
    if producto is None:
        producto = Producto(id=producto_id, kiosko_id=kiosko_id)
        sesion.add(producto)
    elif producto.kiosko_id != kiosko_id:
        raise HTTPException(404, "Producto no encontrado")

    for campo, valor in datos.model_dump().items():
        setattr(producto, campo, valor)

    try:
        sesion.commit()
    except IntegrityError as error:
        sesion.rollback()
        raise HTTPException(409, "Ya existe un producto con ese código de barras") from error

    return a_lectura(producto, calcular_stock(sesion, producto.id))


@router.post("/{producto_id}/movimientos-stock")
def registrar_movimiento_stock(
    producto_id: uuid.UUID, datos: MovimientoStockCrear, sesion: SesionDep, kiosko_id: KioskoIdDep
) -> ProductoLeer:
    """Devuelve el producto con el stock actualizado."""
    producto = buscar_producto(sesion, kiosko_id, producto_id)

    # Si el movimiento ya existe es un reintento del cliente: no se vuelve a aplicar.
    if sesion.get(MovimientoStock, datos.id) is not None:
        return a_lectura(producto, calcular_stock(sesion, producto.id))

    if producto.unidad == Unidad.UNIDAD and datos.cantidad != datos.cantidad.to_integral_value():
        raise HTTPException(422, "Este producto se vende por unidad: la cantidad debe ser entera")

    stock_actual = calcular_stock(sesion, producto.id)
    match datos.motivo:
        case "compra":
            diferencia = datos.cantidad
        case "merma":
            diferencia = -datos.cantidad
        case "ajuste":
            diferencia = datos.cantidad - stock_actual

    if diferencia != 0:
        sesion.add(
            MovimientoStock(
                id=datos.id,
                kiosko_id=kiosko_id,
                producto_id=producto.id,
                cantidad=diferencia,
                motivo=MotivoStock(datos.motivo),
            )
        )
        sesion.commit()

    return a_lectura(producto, stock_actual + diferencia)

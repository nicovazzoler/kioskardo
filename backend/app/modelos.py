"""Modelo de datos.

Convenciones:
- Montos en centavos (BigInteger): 150050 = $1.500,50.
- Ids UUID generados en el cliente, para poder crear registros sin conexión.
- Todo cuelga de un kiosko_id, aunque hoy haya uno solo.
"""

import enum
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Numeric,
    String,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Unidad(enum.StrEnum):
    UNIDAD = "unidad"
    KG = "kg"


class MotivoStock(enum.StrEnum):
    COMPRA = "compra"
    VENTA = "venta"
    AJUSTE = "ajuste"
    MERMA = "merma"
    # Devuelve al stock lo que salió en una venta anulada.
    ANULACION = "anulacion"


class MedioPago(enum.StrEnum):
    EFECTIVO = "efectivo"
    DEBITO = "debito"
    CREDITO = "credito"
    TRANSFERENCIA = "transferencia"
    QR = "qr"


class TipoMovimientoCaja(enum.StrEnum):
    INGRESO = "ingreso"
    EGRESO = "egreso"


def columna_enum(tipo: type[enum.StrEnum]) -> Enum:
    # VARCHAR + CHECK en vez de ENUM nativo: sumar un valor después es una migración simple.
    return Enum(
        tipo,
        native_enum=False,
        create_constraint=True,
        length=20,
        values_callable=lambda miembros: [m.value for m in miembros],
    )


def columna_creado_en() -> Mapped[datetime]:
    return mapped_column(DateTime(timezone=True), server_default=func.now())


class Kiosko(Base):
    __tablename__ = "kioskos"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    nombre: Mapped[str] = mapped_column(String(120))
    creado_en: Mapped[datetime] = columna_creado_en()


class Producto(Base):
    __tablename__ = "productos"
    __table_args__ = (
        # Un código no se repite dentro de un kiosko. Los productos sin código (sueltos) no cuentan.
        Index(
            "uq_productos_kiosko_codigo",
            "kiosko_id",
            "codigo_barras",
            unique=True,
            postgresql_where=text("codigo_barras IS NOT NULL"),
        ),
        CheckConstraint("precio_venta >= 0", name="precio_no_negativo"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    kiosko_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("kioskos.id"), index=True)
    codigo_barras: Mapped[str | None] = mapped_column(String(64))
    nombre: Mapped[str] = mapped_column(String(200))
    precio_venta: Mapped[int] = mapped_column(BigInteger)
    costo: Mapped[int | None] = mapped_column(BigInteger)
    unidad: Mapped[Unidad] = mapped_column(columna_enum(Unidad), default=Unidad.UNIDAD)
    stock_minimo: Mapped[Decimal] = mapped_column(Numeric(12, 3), default=0)
    # Los productos no se borran (las ventas viejas los referencian): se desactivan.
    activo: Mapped[bool] = mapped_column(default=True)
    creado_en: Mapped[datetime] = columna_creado_en()
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class MovimientoStock(Base):
    """El stock de un producto es la suma de sus movimientos: +24 compra, -2 venta, etc."""

    __tablename__ = "movimientos_stock"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    kiosko_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("kioskos.id"))
    producto_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("productos.id"), index=True)
    # Numeric y no entero: los productos por peso se mueven en fracciones de kg.
    cantidad: Mapped[Decimal] = mapped_column(Numeric(12, 3))
    motivo: Mapped[MotivoStock] = mapped_column(columna_enum(MotivoStock))
    venta_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("ventas.id"))
    creado_en: Mapped[datetime] = columna_creado_en()


class Caja(Base):
    """Una sesión de caja: desde que se abre con un monto inicial hasta el cierre con arqueo."""

    __tablename__ = "cajas"
    __table_args__ = (
        # Solo una caja abierta por kiosko a la vez; lo garantiza la base, no el código.
        Index(
            "uq_cajas_una_abierta_por_kiosko",
            "kiosko_id",
            unique=True,
            postgresql_where=text("cerrada_en IS NULL"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    kiosko_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("kioskos.id"))
    abierta_en: Mapped[datetime] = columna_creado_en()
    cerrada_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    monto_inicial: Mapped[int] = mapped_column(BigInteger)
    # Lo que se contó físicamente al cerrar. El esperado se calcula con ventas y movimientos.
    monto_contado: Mapped[int | None] = mapped_column(BigInteger)
    nota: Mapped[str | None] = mapped_column(String(500))


class Venta(Base):
    __tablename__ = "ventas"
    __table_args__ = (Index("ix_ventas_kiosko_fecha", "kiosko_id", "creado_en"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    kiosko_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("kioskos.id"))
    caja_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cajas.id"), index=True)
    total: Mapped[int] = mapped_column(BigInteger)
    anulada: Mapped[bool] = mapped_column(default=False)
    creado_en: Mapped[datetime] = columna_creado_en()

    items: Mapped[list["VentaItem"]] = relationship(
        back_populates="venta", cascade="all, delete-orphan"
    )
    pagos: Mapped[list["VentaPago"]] = relationship(
        back_populates="venta", cascade="all, delete-orphan"
    )


class VentaItem(Base):
    __tablename__ = "venta_items"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    venta_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("ventas.id", ondelete="CASCADE"), index=True
    )
    # None en los ítems "Varios": un monto libre que no sale del inventario.
    producto_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("productos.id"))
    # Copia del nombre y precio al vender: si el producto cambia después, la venta queda como fue.
    nombre: Mapped[str] = mapped_column(String(200))
    precio_unitario: Mapped[int] = mapped_column(BigInteger)
    cantidad: Mapped[Decimal] = mapped_column(Numeric(12, 3))
    subtotal: Mapped[int] = mapped_column(BigInteger)

    venta: Mapped[Venta] = relationship(back_populates="items")


class VentaPago(Base):
    """Una venta puede pagarse con más de un medio (ej: parte efectivo, parte transferencia)."""

    __tablename__ = "venta_pagos"
    __table_args__ = (CheckConstraint("monto > 0", name="monto_positivo"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    venta_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("ventas.id", ondelete="CASCADE"), index=True
    )
    medio: Mapped[MedioPago] = mapped_column(columna_enum(MedioPago))
    # Lo que se aplica a la venta. En efectivo puede diferir de lo que entregó el cliente.
    monto: Mapped[int] = mapped_column(BigInteger)
    # Solo efectivo: con cuánto pagó el cliente, para calcular e imprimir el vuelto.
    recibido: Mapped[int | None] = mapped_column(BigInteger)

    venta: Mapped[Venta] = relationship(back_populates="pagos")


class MovimientoCaja(Base):
    """Plata que entra o sale de la caja sin ser una venta: pago a proveedor, retiro, cambio."""

    __tablename__ = "movimientos_caja"
    __table_args__ = (CheckConstraint("monto > 0", name="monto_positivo"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    kiosko_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("kioskos.id"))
    caja_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cajas.id"), index=True)
    tipo: Mapped[TipoMovimientoCaja] = mapped_column(columna_enum(TipoMovimientoCaja))
    monto: Mapped[int] = mapped_column(BigInteger)
    motivo: Mapped[str] = mapped_column(String(200))
    creado_en: Mapped[datetime] = columna_creado_en()

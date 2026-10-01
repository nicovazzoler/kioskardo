import uuid
from datetime import datetime
from decimal import Decimal
from typing import Annotated, Literal, Self

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.modelos import MedioPago, TipoMovimientoCaja, Unidad

Centavos = Annotated[int, Field(ge=0)]
Cantidad = Annotated[Decimal, Field(ge=0, max_digits=12, decimal_places=3)]


class ProductoGuardar(BaseModel):
    codigo_barras: str | None = Field(default=None, max_length=64)
    nombre: str = Field(min_length=1, max_length=200)
    precio_venta: Centavos
    costo: Centavos | None = None
    unidad: Unidad = Unidad.UNIDAD
    stock_minimo: Cantidad = Decimal(0)
    activo: bool = True

    @field_validator("codigo_barras")
    @classmethod
    def vacio_es_none(cls, valor: str | None) -> str | None:
        valor = valor.strip() if valor else None
        return valor or None

    @field_validator("nombre")
    @classmethod
    def sin_espacios_sobrantes(cls, valor: str) -> str:
        valor = " ".join(valor.split())
        if not valor:
            raise ValueError("El nombre no puede estar vacío")
        return valor


class ProductoLeer(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    codigo_barras: str | None
    nombre: str
    precio_venta: int
    costo: int | None
    unidad: Unidad
    # float y no Decimal: Pydantic serializa Decimal como string y el frontend espera números.
    stock_minimo: float
    activo: bool
    stock: float


class MovimientoStockCrear(BaseModel):
    """Qué significa `cantidad` depende del motivo:
    - compra: unidades que entran.
    - merma: unidades que se pierden (rotura, vencimiento).
    - ajuste: el stock real contado; el movimiento se calcula por diferencia.
    """

    id: uuid.UUID
    motivo: Literal["compra", "merma", "ajuste"]
    cantidad: Cantidad


class CajaAbrir(BaseModel):
    monto_inicial: Centavos
    # Viene del cliente: si se abrió sin conexión, la hora real es la del dispositivo.
    abierta_en: datetime | None = None


class CajaLeer(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    abierta_en: datetime
    cerrada_en: datetime | None
    monto_inicial: int
    monto_contado: int | None
    nota: str | None


class CajaCerrar(BaseModel):
    monto_contado: Centavos
    nota: str | None = Field(default=None, max_length=500)
    cerrada_en: datetime | None = None


class ResumenCaja(BaseModel):
    cantidad_ventas: int
    total_ventas: int
    por_medio: dict[MedioPago, int]
    ingresos: int
    egresos: int
    # Inicial + ventas en efectivo + ingresos - egresos: lo que debería haber en el cajón.
    efectivo_esperado: int


class CajaConResumen(CajaLeer):
    resumen: ResumenCaja


class MovimientoCajaCrear(BaseModel):
    id: uuid.UUID
    tipo: TipoMovimientoCaja
    monto: Annotated[int, Field(gt=0)]
    motivo: str = Field(min_length=1, max_length=200)
    creado_en: datetime


class MovimientoCajaLeer(MovimientoCajaCrear):
    model_config = ConfigDict(from_attributes=True)

    caja_id: uuid.UUID


class VentaItemCrear(BaseModel):
    id: uuid.UUID
    producto_id: uuid.UUID | None
    nombre: str = Field(min_length=1, max_length=200)
    precio_unitario: Centavos
    cantidad: Annotated[Decimal, Field(gt=0, max_digits=12, decimal_places=3)]
    subtotal: Centavos

    @model_validator(mode="after")
    def subtotal_coherente(self) -> Self:
        # La cantidad se redondea a gramos, así que "$500 de caramelos" puede no dar exacto:
        # se tolera la diferencia de medio gramo más un centavo de redondeo.
        exacto = self.precio_unitario * self.cantidad
        tolerancia = self.precio_unitario * Decimal("0.0005") + 1
        if abs(self.subtotal - exacto) > tolerancia:
            raise ValueError(f"El subtotal de '{self.nombre}' no coincide con precio × cantidad")
        return self


class VentaPagoCrear(BaseModel):
    id: uuid.UUID
    medio: MedioPago
    monto: Annotated[int, Field(gt=0)]
    recibido: Centavos | None = None

    @model_validator(mode="after")
    def recibido_solo_en_efectivo(self) -> Self:
        if self.recibido is not None:
            if self.medio != MedioPago.EFECTIVO:
                raise ValueError("Solo los pagos en efectivo llevan monto recibido")
            if self.recibido < self.monto:
                raise ValueError("El monto recibido no alcanza")
        return self


class VentaCrear(BaseModel):
    caja_id: uuid.UUID
    creado_en: datetime
    items: list[VentaItemCrear] = Field(min_length=1)
    pagos: list[VentaPagoCrear] = Field(min_length=1)

    @property
    def total(self) -> int:
        return sum(item.subtotal for item in self.items)

    @model_validator(mode="after")
    def pagos_cubren_el_total(self) -> Self:
        pagado = sum(pago.monto for pago in self.pagos)
        if pagado != self.total:
            raise ValueError(f"Los pagos suman {pagado} y el total es {self.total}")
        return self


class VentaItemLeer(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    producto_id: uuid.UUID | None
    nombre: str
    precio_unitario: int
    cantidad: float
    subtotal: int


class VentaPagoLeer(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    medio: MedioPago
    monto: int
    recibido: int | None


class VentaLeer(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    caja_id: uuid.UUID
    total: int
    anulada: bool
    creado_en: datetime
    items: list[VentaItemLeer]
    pagos: list[VentaPagoLeer]

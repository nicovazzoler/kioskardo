import uuid
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.modelos import Unidad

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

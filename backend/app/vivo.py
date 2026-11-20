"""Salas en memoria: andan con un solo proceso de uvicorn. Con varios, cada proceso tendría sus
propias salas y haría falta repartir los mensajes entre procesos (por ejemplo con Redis).
"""

import uuid
from collections import defaultdict
from typing import Annotated, Any, Literal

from fastapi import WebSocket
from pydantic import BaseModel, Field, TypeAdapter, ValidationError

from app.esquemas import Centavos

Rol = Literal["caja", "pantalla", "escaner"]


class Hola(BaseModel):
    tipo: Literal["hola"]
    rol: Rol
    token: str | None = Field(default=None, max_length=500)


class LineaEnVivo(BaseModel):
    id: str = Field(max_length=64)
    nombre: str = Field(max_length=200)
    cantidad: str = Field(max_length=20)
    detalle: str = Field(max_length=100)
    subtotal: Centavos


class VentaCobrada(BaseModel):
    id: str = Field(max_length=64)
    total: Centavos
    vuelto: Centavos


class VentaEnVivo(BaseModel):
    items: list[LineaEnVivo] = Field(max_length=500)
    total: Centavos
    # Con cuánto dijo que paga, si se eligió.
    recibido: Centavos | None
    # La venta que se acaba de cobrar, hasta que se empieza otra.
    cobrada: VentaCobrada | None


class MensajeVenta(BaseModel):
    tipo: Literal["venta"]
    venta: VentaEnVivo


class MensajeCodigo(BaseModel):
    tipo: Literal["codigo"]
    codigo: str = Field(min_length=1, max_length=64)


class Ping(BaseModel):
    tipo: Literal["ping"]


MensajeCliente = Annotated[MensajeVenta | MensajeCodigo | Ping, Field(discriminator="tipo")]
leer_mensaje = TypeAdapter(MensajeCliente)


class Sala:
    def __init__(self) -> None:
        self.conexiones: dict[WebSocket, Rol] = {}
        self.venta: dict[str, Any] | None = None

    def cajas(self) -> int:
        return sum(rol == "caja" for rol in self.conexiones.values())

    async def entrar(self, websocket: WebSocket, rol: Rol) -> None:
        self.conexiones[websocket] = rol
        # Este primer mensaje también le confirma al que entra que la clave estaba bien.
        await _enviar(websocket, {"tipo": "cajas", "conectadas": self.cajas()})
        if rol == "caja":
            await self._avisar_cajas()
        elif self.venta:
            await _enviar(websocket, {"tipo": "venta", "venta": self.venta})

    async def salir(self, websocket: WebSocket) -> None:
        if self.conexiones.pop(websocket, None) != "caja":
            return
        if self.cajas() == 0:
            self.venta = None
        await self._avisar_cajas()

    async def recibir(self, websocket: WebSocket, texto: str) -> None:
        try:
            mensaje = leer_mensaje.validate_json(texto)
        except ValidationError:
            # Se ignora en vez de cortar: un frontend viejo en caché quedaría reconectando en loop.
            return
        rol = self.conexiones[websocket]
        if isinstance(mensaje, Ping):
            await _enviar(websocket, {"tipo": "pong"})
        elif isinstance(mensaje, MensajeVenta) and rol == "caja":
            self.venta = mensaje.venta.model_dump(mode="json")
            await self._repartir({"tipo": "venta", "venta": self.venta}, a=("pantalla", "escaner"))
        elif isinstance(mensaje, MensajeCodigo) and rol == "escaner":
            await self._repartir({"tipo": "codigo", "codigo": mensaje.codigo}, a=("caja",))

    async def _avisar_cajas(self) -> None:
        aviso = {"tipo": "cajas", "conectadas": self.cajas()}
        await self._repartir(aviso, a=("pantalla", "escaner"))

    async def _repartir(self, mensaje: dict[str, Any], a: tuple[Rol, ...]) -> None:
        # Copia: mientras se espera un envío, otra conexión puede entrar o salir de la sala.
        for websocket, rol in list(self.conexiones.items()):
            if rol in a:
                await _enviar(websocket, mensaje)


async def _enviar(websocket: WebSocket, mensaje: dict[str, Any]) -> None:
    try:
        await websocket.send_json(mensaje)
    except Exception:
        # Si el otro ya se desconectó, su propio handler lo saca de la sala.
        pass


salas: defaultdict[uuid.UUID, Sala] = defaultdict(Sala)

"""Llena una base local con datos inventados: catálogo con códigos de barras, ventas de varios
días con distintos medios de pago y cajas cerradas con arqueo. Es para mostrar la app con
movimiento (capturas, demos), no para probar nada.

Uso: python -m app.sembrador [--rehacer]
"""

import argparse
import random
import uuid
from dataclasses import dataclass, field
from datetime import datetime, time, timedelta, timezone
from decimal import Decimal

from sqlalchemy import delete, func, select
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from app.config import config, es_base_local
from app.db import SesionLocal
from app.modelos import (
    Caja,
    Kiosko,
    MedioPago,
    MotivoStock,
    MovimientoCaja,
    MovimientoStock,
    Producto,
    TipoMovimientoCaja,
    Unidad,
    Venta,
    VentaItem,
    VentaPago,
)
from app.semilla import NOMBRE_KIOSKO

# Argentina no tiene horario de verano, así que un offset fijo alcanza y no hace falta tzdata.
ARGENTINA = timezone(timedelta(hours=-3))

DIAS = 7
HORA_APERTURA = time(7, 30)
HORA_CIERRE = time(21, 15)
MONTO_INICIAL = 3_000_000
# La caja de hoy llega hasta la hora en que se siembra, así que puede quedar con pocas horas
# encima: igual tiene que mostrar movimiento.
MINIMO_VENTAS_HOY = 12

# Misma corrida, mismos datos: las capturas no cambian solas entre sembradas.
AZAR = random.Random(2026)

PESOS_MEDIOS = {
    MedioPago.EFECTIVO: 52,
    MedioPago.DEBITO: 16,
    MedioPago.QR: 14,
    MedioPago.CREDITO: 10,
    MedioPago.TRANSFERENCIA: 8,
}

# Billetes argentinos en centavos: con cuánto paga el cliente cuando paga en efectivo.
BILLETES = (100_000, 200_000, 1_000_000, 2_000_000)


@dataclass
class Articulo:
    """Un producto del catálogo y cuánto stock tiene que quedarle después de las ventas.

    `sobra` por debajo de `minimo` es a propósito en algunos: el inventario tiene que mostrar
    el aviso de stock bajo.
    """

    nombre: str
    precio: int
    costo: int
    popularidad: int
    sobra: Decimal
    minimo: Decimal = Decimal(0)
    unidad: Unidad = Unidad.UNIDAD
    merma: Decimal = Decimal(0)
    id: uuid.UUID = field(default_factory=uuid.uuid4)
    vendido: Decimal = Decimal(0)


CATALOGO = [
    Articulo("Gaseosa cola 500 ml", 250_000, 158_000, 30, Decimal(18), Decimal(12)),
    Articulo("Gaseosa lima limón 500 ml", 240_000, 151_000, 14, Decimal(11), Decimal(12)),
    Articulo("Agua mineral sin gas 500 ml", 175_000, 104_000, 20, Decimal(24), Decimal(12)),
    Articulo("Cerveza rubia lata 473 ml", 320_000, 221_000, 18, Decimal(16), Decimal(12)),
    Articulo("Energizante lata 310 ml", 480_000, 342_000, 9, Decimal(9), Decimal(6)),
    Articulo("Alfajor triple de chocolate", 185_000, 117_000, 28, Decimal(14), Decimal(12)),
    Articulo("Alfajor simple de dulce de leche", 130_000, 82_000, 22, Decimal(20), Decimal(12)),
    Articulo("Chocolate con leche 25 g", 160_000, 101_000, 16, Decimal(13), Decimal(10)),
    Articulo("Barrita de cereal", 145_000, 92_000, 10, Decimal(15), Decimal(10)),
    Articulo("Chicles menta pastillero", 95_000, 58_000, 12, Decimal(26), Decimal(10)),
    Articulo("Chupetín frutal", 70_000, 41_000, 15, Decimal(40), Decimal(20)),
    Articulo("Turrón de maní", 120_000, 74_000, 11, Decimal(17), Decimal(10)),
    Articulo("Galletitas dulces 120 g", 290_000, 196_000, 13, Decimal(9), Decimal(8)),
    Articulo("Galletitas de agua 100 g", 265_000, 178_000, 8, Decimal(10), Decimal(8)),
    Articulo("Papas fritas 75 g", 420_000, 289_000, 14, Decimal(12), Decimal(8)),
    Articulo("Palitos salados 100 g", 310_000, 208_000, 7, Decimal(7), Decimal(6)),
    Articulo(
        "Helado palito de agua", 260_000, 163_000, 12, Decimal(3), Decimal(8), merma=Decimal(2)
    ),
    Articulo("Cigarrillos box 20", 650_000, 541_000, 19, Decimal(8), Decimal(6)),
    Articulo("Encendedor", 240_000, 148_000, 6, Decimal(14), Decimal(6)),
    Articulo("Pilas AA por 2", 560_000, 388_000, 4, Decimal(5), Decimal(4)),
    Articulo("Yerba mate 1 kg", 980_000, 742_000, 5, Decimal(4), Decimal(4)),
    Articulo(
        "Leche entera sachet 1 L", 230_000, 171_000, 9, Decimal(0), Decimal(6), merma=Decimal(1)
    ),
    Articulo("Preservativos por 3", 750_000, 512_000, 3, Decimal(6), Decimal(4)),
    Articulo(
        "Caramelos surtidos",
        900_000,
        610_000,
        10,
        Decimal("3.400"),
        Decimal("1.500"),
        unidad=Unidad.KG,
    ),
    Articulo(
        "Maní con chocolate",
        1_450_000,
        985_000,
        7,
        Decimal("1.250"),
        Decimal("1.000"),
        unidad=Unidad.KG,
    ),
]

# Ítems de monto libre: lo que el kiosco cobra y no está en el inventario.
VARIOS = [
    ("Fotocopias", 150_000),
    ("Carga de SUBE", 500_000),
    ("Recarga de celular", 1_000_000),
    ("Impresión en color", 250_000),
    ("Cospeles para el lavadero", 400_000),
]

INGRESOS_CAJA = [
    "Cambio traído de casa",
    "Vuelto que quedó debiendo un cliente",
]

EGRESOS_CAJA = [
    "Pago al proveedor de golosinas",
    "Pago al diariero",
    "Retiro del dueño",
    "Flete de la bebida",
    "Compra de bolsas y rollos de ticket",
]

NOTAS_FALTANTE = [
    "Faltó plata, seguro un vuelto mal dado",
    "Diferencia chica, no aparece el billete",
]

NOTAS_SOBRANTE = [
    "Sobró plata, puede ser una venta cobrada de más",
    "Quedó un vuelto sin entregar",
]


def en_pesos(centavos: int) -> str:
    """150050 -> «$1.500,50», como lo muestra la app."""
    entero, decimales = divmod(centavos, 100)
    return f"${entero:,}".replace(",", ".") + f",{decimales:02d}"


def digito_verificador(doce_digitos: str) -> str:
    """Último dígito de un EAN-13: lo que valida la pistola lectora al escanear."""
    suma = sum(int(d) * (3 if i % 2 else 1) for i, d in enumerate(doce_digitos))
    return str((10 - suma % 10) % 10)


def codigo_barras(indice: int) -> str:
    # 779 es el prefijo de Argentina; el resto es inventado, pero el dígito final cierra.
    base = f"779{indice:09d}"
    return base + digito_verificador(base)


def exigir_base_local(url_texto: str) -> None:
    """El sembrador escribe datos inventados y con --rehacer borra lo que haya: contra una base
    que no sea local se niega a correr.
    """
    if not es_base_local(url_texto):
        raise SystemExit(
            f"DATABASE_URL apunta a «{make_url(url_texto).host}» y el sembrador solo corre"
            " contra una base local."
        )


def obtener_kiosko(sesion: Session) -> Kiosko:
    kiosko = sesion.scalar(select(Kiosko).limit(1))
    if kiosko is None:
        kiosko = Kiosko(nombre=NOMBRE_KIOSKO)
        sesion.add(kiosko)
        sesion.flush()
    return kiosko


def vaciar_datos(sesion: Session) -> None:
    """Borra todo menos el kiosko, en orden de claves foráneas."""
    for modelo in (
        MovimientoStock,
        VentaPago,
        VentaItem,
        Venta,
        MovimientoCaja,
        Caja,
        Producto,
    ):
        sesion.execute(delete(modelo))
    sesion.flush()


def hay_datos(sesion: Session) -> bool:
    return bool(
        sesion.scalar(select(func.count()).select_from(Producto))
        or sesion.scalar(select(func.count()).select_from(Venta))
    )


def instante(desde: datetime, hasta: datetime) -> datetime:
    """Un momento al azar entre otros dos."""
    return desde + timedelta(seconds=AZAR.randrange(max(1, int((hasta - desde).total_seconds()))))


def elegir_articulos() -> list[Articulo]:
    cantidad = AZAR.choices((1, 2, 3, 4), weights=(42, 33, 17, 8))[0]
    elegidos: list[Articulo] = []
    pesos = [a.popularidad for a in CATALOGO]
    while len(elegidos) < cantidad:
        articulo = AZAR.choices(CATALOGO, weights=pesos)[0]
        if articulo not in elegidos:
            elegidos.append(articulo)
    return elegidos


def armar_item(articulo: Articulo) -> VentaItem:
    if articulo.unidad == Unidad.KG:
        cantidad = Decimal(AZAR.randrange(100, 701, 50)) / 1000
    else:
        cantidad = Decimal(AZAR.choices((1, 2, 3), weights=(72, 22, 6))[0])
    articulo.vendido += cantidad
    return VentaItem(
        producto_id=articulo.id,
        nombre=articulo.nombre,
        precio_unitario=articulo.precio,
        cantidad=cantidad,
        subtotal=int((articulo.precio * cantidad).to_integral_value()),
    )


def armar_item_varios() -> VentaItem:
    nombre, monto = AZAR.choice(VARIOS)
    return VentaItem(
        producto_id=None,
        nombre=nombre,
        precio_unitario=monto,
        cantidad=Decimal(1),
        subtotal=monto,
    )


def armar_pagos(total: int) -> list[VentaPago]:
    """Un medio de pago, o dos cuando el cliente no tiene todo en efectivo."""
    medios = list(PESOS_MEDIOS)
    pesos = list(PESOS_MEDIOS.values())
    if AZAR.random() < 0.07 and total > 400_000:
        # Parte en efectivo y el resto con tarjeta o QR, redondeando a $100 la parte en efectivo.
        en_efectivo = max(100_000, round(total * AZAR.uniform(0.3, 0.6) / 10_000) * 10_000)
        resto = total - en_efectivo
        otro = AZAR.choice([m for m in medios if m != MedioPago.EFECTIVO])
        return [
            VentaPago(medio=MedioPago.EFECTIVO, monto=en_efectivo, recibido=en_efectivo),
            VentaPago(medio=otro, monto=resto),
        ]

    medio = AZAR.choices(medios, weights=pesos)[0]
    if medio != MedioPago.EFECTIVO:
        return [VentaPago(medio=medio, monto=total)]

    # Paga con billetes de uno solo: los que hagan falta para cubrir el total.
    billete = AZAR.choice([b for b in BILLETES if b >= total] or [BILLETES[-1]])
    cuantos = -(-total // billete)
    return [VentaPago(medio=medio, monto=total, recibido=cuantos * billete)]


def armar_venta(kiosko_id: uuid.UUID, caja: Caja, creado_en: datetime) -> Venta:
    items = [armar_item(articulo) for articulo in elegir_articulos()]
    if AZAR.random() < 0.12:
        items.append(armar_item_varios())
    total = sum(item.subtotal for item in items)
    return Venta(
        kiosko_id=kiosko_id,
        caja_id=caja.id,
        total=total,
        creado_en=creado_en,
        items=items,
        pagos=armar_pagos(total),
    )


def cobrado_en_efectivo(ventas: list[Venta]) -> int:
    return sum(
        pago.monto
        for venta in ventas
        if not venta.anulada
        for pago in venta.pagos
        if pago.medio == MedioPago.EFECTIVO
    )


def efectivo_esperado(caja: Caja, ventas: list[Venta], movimientos: list[MovimientoCaja]) -> int:
    """La misma cuenta que hace app/resumen.py, para que el arqueo del cierre cierre."""
    en_efectivo = cobrado_en_efectivo(ventas)
    ingresos = sum(m.monto for m in movimientos if m.tipo == TipoMovimientoCaja.INGRESO)
    egresos = sum(m.monto for m in movimientos if m.tipo == TipoMovimientoCaja.EGRESO)
    return caja.monto_inicial + en_efectivo + ingresos - egresos


def armar_movimientos_caja(
    kiosko_id: uuid.UUID, caja: Caja, desde: datetime, hasta: datetime, en_el_cajon: int
) -> list[MovimientoCaja]:
    movimientos = []
    for _ in range(AZAR.choices((0, 1, 2), weights=(20, 50, 30))[0]):
        movimientos.append(
            MovimientoCaja(
                kiosko_id=kiosko_id,
                caja_id=caja.id,
                tipo=TipoMovimientoCaja.EGRESO,
                # Una parte de lo que hay en el cajón, redondeada a $100: nadie paga al
                # proveedor más plata de la que juntó en el día.
                monto=max(10_000, round(en_el_cajon * AZAR.uniform(0.05, 0.22) / 10_000) * 10_000),
                motivo=AZAR.choice(EGRESOS_CAJA),
                creado_en=instante(desde, hasta),
            )
        )
    if AZAR.random() < 0.4:
        movimientos.append(
            MovimientoCaja(
                kiosko_id=kiosko_id,
                caja_id=caja.id,
                tipo=TipoMovimientoCaja.INGRESO,
                monto=AZAR.randrange(10, 51) * 100_000,
                motivo=AZAR.choice(INGRESOS_CAJA),
                creado_en=instante(desde, hasta),
            )
        )
    return movimientos


def cerrar_con_arqueo(caja: Caja, esperado: int, cierre: datetime) -> None:
    """Casi siempre cierra justo; cuando no, queda la diferencia y la nota del cierre."""
    diferencia = AZAR.choices((0, -50_000, -20_000, 30_000), weights=(60, 15, 15, 10))[0]
    caja.cerrada_en = cierre
    caja.monto_contado = esperado + diferencia
    if diferencia < 0:
        caja.nota = AZAR.choice(NOTAS_FALTANTE)
    elif diferencia > 0:
        caja.nota = AZAR.choice(NOTAS_SOBRANTE)


def armar_compras(kiosko_id: uuid.UUID, primer_dia: datetime) -> list[MovimientoStock]:
    """Las compras al proveedor, calculadas después de las ventas para que el stock que queda
    sea el de `Articulo.sobra` y nunca dé negativo.
    """
    movimientos = []
    reposicion = primer_dia + timedelta(days=DIAS // 2)
    for articulo in CATALOGO:
        total = articulo.vendido + articulo.sobra + articulo.merma
        if articulo.unidad == Unidad.KG:
            primera = (total * Decimal("0.7")).quantize(Decimal("0.001"))
        else:
            primera = (total * Decimal("0.7")).to_integral_value()
        for cantidad, cuando in ((primera, primer_dia), (total - primera, reposicion)):
            if cantidad > 0:
                movimientos.append(
                    MovimientoStock(
                        kiosko_id=kiosko_id,
                        producto_id=articulo.id,
                        cantidad=cantidad,
                        motivo=MotivoStock.COMPRA,
                        creado_en=cuando,
                    )
                )
        if articulo.merma:
            movimientos.append(
                MovimientoStock(
                    kiosko_id=kiosko_id,
                    producto_id=articulo.id,
                    cantidad=-articulo.merma,
                    motivo=MotivoStock.MERMA,
                    creado_en=reposicion + timedelta(hours=6),
                )
            )
    return movimientos


def sembrar(sesion: Session) -> None:
    kiosko = obtener_kiosko(sesion)
    ahora = datetime.now(ARGENTINA)
    hoy = ahora.replace(hour=0, minute=0, second=0, microsecond=0)

    sesion.add_all(
        Producto(
            id=articulo.id,
            kiosko_id=kiosko.id,
            codigo_barras=codigo_barras(indice),
            nombre=articulo.nombre,
            precio_venta=articulo.precio,
            costo=articulo.costo,
            unidad=articulo.unidad,
            stock_minimo=articulo.minimo,
            creado_en=hoy - timedelta(days=DIAS + 1),
        )
        for indice, articulo in enumerate(CATALOGO, start=1)
    )

    ventas: list[Venta] = []
    for atras in range(DIAS - 1, -1, -1):
        dia = hoy - timedelta(days=atras)
        es_hoy = atras == 0
        apertura = datetime.combine(dia, HORA_APERTURA, tzinfo=ARGENTINA)
        cierre = datetime.combine(dia, HORA_CIERRE, tzinfo=ARGENTINA)
        # En la caja de hoy no puede pasar nada más tarde que ahora.
        fin = (ahora - timedelta(minutes=2)) if es_hoy else cierre - timedelta(minutes=20)
        # Sembrando de madrugada, hoy todavía no abrió: la caja arranca unas horas antes.
        if fin - apertura < timedelta(hours=2):
            apertura = fin - timedelta(hours=3)

        caja = Caja(kiosko_id=kiosko.id, monto_inicial=MONTO_INICIAL, abierta_en=apertura)
        sesion.add(caja)
        sesion.flush()

        horas = (fin - apertura).total_seconds() / 3600
        cuantas = round(horas * AZAR.uniform(1.8, 2.6))
        del_dia = [
            armar_venta(kiosko.id, caja, instante(apertura, fin))
            for _ in range(max(cuantas, MINIMO_VENTAS_HOY) if es_hoy else cuantas)
        ]
        del_dia.sort(key=lambda venta: venta.creado_en)
        # Una venta anulada en la semana, para que la lista de ventas la muestre tachada.
        if atras == 2 and del_dia:
            del_dia[len(del_dia) // 2].anulada = True
        ventas.extend(del_dia)

        movimientos = armar_movimientos_caja(
            kiosko.id,
            caja,
            apertura + timedelta(minutes=45),
            fin,
            MONTO_INICIAL + cobrado_en_efectivo(del_dia),
        )
        sesion.add_all(del_dia + movimientos)
        if not es_hoy:
            cerrar_con_arqueo(caja, efectivo_esperado(caja, del_dia, movimientos), cierre)

    # MovimientoStock no tiene relationship con Venta: hay que mandar las ventas a la base antes.
    sesion.flush()
    for venta in ventas:
        for item in venta.items:
            if item.producto_id is None:
                continue
            sesion.add(
                MovimientoStock(
                    kiosko_id=kiosko.id,
                    producto_id=item.producto_id,
                    cantidad=-item.cantidad,
                    motivo=MotivoStock.VENTA,
                    venta_id=venta.id,
                    creado_en=venta.creado_en,
                )
            )
            if venta.anulada:
                sesion.add(
                    MovimientoStock(
                        kiosko_id=kiosko.id,
                        producto_id=item.producto_id,
                        cantidad=item.cantidad,
                        motivo=MotivoStock.ANULACION,
                        venta_id=venta.id,
                        creado_en=venta.creado_en + timedelta(minutes=8),
                    )
                )

    sesion.add_all(armar_compras(kiosko.id, hoy - timedelta(days=DIAS)))
    sesion.commit()

    vendido = sum(venta.total for venta in ventas if not venta.anulada)
    print(f"Kiosko: {kiosko.nombre} ({kiosko.id})")
    print(f"Productos: {len(CATALOGO)}")
    print(f"Ventas: {len(ventas)} en {DIAS} días, {en_pesos(vendido)} en total")
    print(f"Cajas: {DIAS - 1} cerradas con arqueo y la de hoy abierta")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--rehacer",
        action="store_true",
        help="borra productos, ventas y cajas antes de sembrar de nuevo",
    )
    argumentos = parser.parse_args()

    exigir_base_local(config.database_url)
    with SesionLocal() as sesion:
        if hay_datos(sesion):
            if not argumentos.rehacer:
                raise SystemExit(
                    "La base ya tiene productos o ventas. Para reemplazarlos: "
                    "python -m app.sembrador --rehacer"
                )
            vaciar_datos(sesion)
        sembrar(sesion)


if __name__ == "__main__":
    main()

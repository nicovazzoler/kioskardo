import uuid

from tests.test_productos import mover_stock, nuevo_producto
from tests.test_ventas import item, pago, stock_de, vender


def movimiento(cliente, caja, tipo, monto, motivo="Pago a proveedor", movimiento_id=None):
    return cliente.post(
        f"/api/cajas/{caja['id']}/movimientos",
        json={
            "id": movimiento_id or str(uuid.uuid4()),
            "tipo": tipo,
            "monto": monto,
            "motivo": motivo,
            "creado_en": "2026-09-30T12:00:00-03:00",
        },
    )


def resumen(cliente, caja):
    return cliente.get(f"/api/cajas/{caja['id']}").json()["resumen"]


def cerrar(cliente, caja, contado, nota=None):
    return cliente.post(
        f"/api/cajas/{caja['id']}/cerrar", json={"monto_contado": contado, "nota": nota}
    )


def test_resumen_de_caja_vacia(cliente, caja):
    assert resumen(cliente, caja) == {
        "cantidad_ventas": 0,
        "total_ventas": 0,
        "por_medio": {"efectivo": 0, "debito": 0, "credito": 0, "transferencia": 0, "qr": 0},
        "ingresos": 0,
        "egresos": 0,
        "efectivo_esperado": 1000000,
    }


def test_resumen_suma_ventas_por_medio_y_movimientos(cliente, caja):
    producto = nuevo_producto(cliente)
    vender(cliente, caja, [item(producto, cantidad=2)], [pago(100000)])
    vender(cliente, caja, [item(producto)], [pago(50000, "debito")])
    vender(cliente, caja, [item(producto, cantidad=2)], [pago(30000), pago(70000, "qr")])
    movimiento(cliente, caja, "egreso", 200000)
    movimiento(cliente, caja, "ingreso", 50000, "Cambio")

    datos = resumen(cliente, caja)

    assert datos["cantidad_ventas"] == 3
    assert datos["total_ventas"] == 250000
    assert datos["por_medio"]["efectivo"] == 130000
    assert datos["por_medio"]["debito"] == 50000
    assert datos["por_medio"]["qr"] == 70000
    # 10.000 inicial + 1.300 efectivo + 500 ingreso - 2.000 egreso
    assert datos["efectivo_esperado"] == 1000000 + 130000 + 50000 - 200000


def test_reenviar_movimiento_no_lo_duplica(cliente, caja):
    movimiento_id = str(uuid.uuid4())
    movimiento(cliente, caja, "egreso", 1000, movimiento_id=movimiento_id)
    movimiento(cliente, caja, "egreso", 1000, movimiento_id=movimiento_id)
    assert resumen(cliente, caja)["egresos"] == 1000
    assert len(cliente.get(f"/api/cajas/{caja['id']}/movimientos").json()) == 1


def test_movimiento_sin_motivo_da_422(cliente, caja):
    assert movimiento(cliente, caja, "egreso", 1000, motivo="").status_code == 422


def test_cerrar_caja_guarda_arqueo(cliente, caja):
    respuesta = cerrar(cliente, caja, 990000, "Faltaron $100")
    assert respuesta.status_code == 200
    cerrada = respuesta.json()
    assert cerrada["cerrada_en"] is not None
    assert cerrada["monto_contado"] == 990000
    assert cerrada["nota"] == "Faltaron $100"
    assert cerrada["resumen"]["efectivo_esperado"] == 1000000
    assert cliente.get("/api/cajas/abierta").json() is None


def test_cerrar_dos_veces_no_pisa_el_arqueo(cliente, caja):
    cerrar(cliente, caja, 990000)
    assert cerrar(cliente, caja, 0).json()["monto_contado"] == 990000


def test_tras_cerrar_se_puede_abrir_otra(cliente, caja):
    cerrar(cliente, caja, 1000000)
    assert cliente.put(f"/api/cajas/{uuid.uuid4()}", json={"monto_inicial": 0}).status_code == 200


def test_historial_lista_solo_cajas_cerradas(cliente, caja):
    assert cliente.get("/api/cajas").json() == []
    cerrar(cliente, caja, 1000000)
    historial = cliente.get("/api/cajas").json()
    assert [c["id"] for c in historial] == [caja["id"]]
    assert historial[0]["resumen"]["efectivo_esperado"] == 1000000


def test_anular_venta_devuelve_stock_y_sale_del_resumen(cliente, caja):
    producto = nuevo_producto(cliente)
    mover_stock(cliente, producto["id"], "compra", 10)
    venta = vender(cliente, caja, [item(producto, cantidad=3)], [pago(150000)]).json()

    respuesta = cliente.post(f"/api/ventas/{venta['id']}/anular")

    assert respuesta.status_code == 200
    assert respuesta.json()["anulada"] is True
    assert stock_de(cliente, producto) == 10
    assert resumen(cliente, caja)["total_ventas"] == 0


def test_anular_dos_veces_no_duplica_stock(cliente, caja):
    producto = nuevo_producto(cliente)
    venta = vender(cliente, caja, [item(producto)], [pago(50000)]).json()
    cliente.post(f"/api/ventas/{venta['id']}/anular")
    cliente.post(f"/api/ventas/{venta['id']}/anular")
    assert stock_de(cliente, producto) == 0


def test_no_se_anula_venta_de_caja_cerrada(cliente, caja):
    venta = vender(cliente, caja, [item(None, nombre="Varios")], [pago(50000)]).json()
    cerrar(cliente, caja, 1050000)
    assert cliente.post(f"/api/ventas/{venta['id']}/anular").status_code == 409


def test_ventas_de_caja_mas_nueva_primero(cliente, caja):
    for _ in range(2):
        vender(cliente, caja, [item(None, nombre="Varios")], [pago(50000)])
    ventas = cliente.get(f"/api/cajas/{caja['id']}/ventas").json()
    assert len(ventas) == 2

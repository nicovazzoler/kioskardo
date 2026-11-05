import uuid

from tests.test_productos import mover_stock, nuevo_producto


def item(producto=None, precio=50000, cantidad=1, subtotal=None, nombre="Alfajor"):
    return {
        "id": str(uuid.uuid4()),
        "producto_id": producto["id"] if producto else None,
        "nombre": nombre,
        "precio_unitario": precio,
        "cantidad": cantidad,
        "subtotal": subtotal if subtotal is not None else round(precio * cantidad),
    }


def pago(monto, medio="efectivo", recibido=None):
    return {"id": str(uuid.uuid4()), "medio": medio, "monto": monto, "recibido": recibido}


def vender(cliente, caja, items, pagos, venta_id=None):
    return cliente.put(
        f"/api/ventas/{venta_id or uuid.uuid4()}",
        json={
            "caja_id": caja["id"],
            "creado_en": "2026-09-30T10:00:00-03:00",
            "items": items,
            "pagos": pagos,
        },
    )


def stock_de(cliente, producto):
    return next(p for p in cliente.get("/api/productos").json() if p["id"] == producto["id"])[
        "stock"
    ]


def test_abrir_caja_y_consultarla(cliente, caja):
    abierta = cliente.get("/api/cajas/abierta").json()
    assert abierta["id"] == caja["id"]
    assert abierta["monto_inicial"] == 1000000


def test_sin_caja_abierta_devuelve_null(cliente):
    assert cliente.get("/api/cajas/abierta").json() is None


def test_no_se_pueden_abrir_dos_cajas(cliente, caja):
    respuesta = cliente.put(f"/api/cajas/{uuid.uuid4()}", json={"monto_inicial": 0})
    assert respuesta.status_code == 409


def test_reabrir_la_misma_caja_es_idempotente(cliente, caja):
    respuesta = cliente.put(f"/api/cajas/{caja['id']}", json={"monto_inicial": 0})
    assert respuesta.status_code == 200
    assert respuesta.json()["monto_inicial"] == 1000000


def test_venta_descuenta_stock(cliente, caja):
    producto = nuevo_producto(cliente)
    mover_stock(cliente, producto["id"], "compra", 10)

    respuesta = vender(cliente, caja, [item(producto, cantidad=3)], [pago(150000)])

    assert respuesta.status_code == 200, respuesta.text
    venta = respuesta.json()
    assert venta["total"] == 150000
    assert venta["items"][0]["nombre"] == "Alfajor"
    assert stock_de(cliente, producto) == 7


def test_stock_puede_quedar_negativo(cliente, caja):
    producto = nuevo_producto(cliente)
    assert vender(cliente, caja, [item(producto, cantidad=2)], [pago(100000)]).status_code == 200
    assert stock_de(cliente, producto) == -2


def test_reenviar_venta_no_duplica_stock(cliente, caja):
    producto = nuevo_producto(cliente)
    venta_id = str(uuid.uuid4())
    items, pagos = [item(producto)], [pago(50000)]
    vender(cliente, caja, items, pagos, venta_id)
    assert vender(cliente, caja, items, pagos, venta_id).status_code == 200
    assert stock_de(cliente, producto) == -1


def test_pago_con_dos_medios(cliente, caja):
    producto = nuevo_producto(cliente)
    pagos = [pago(30000, "efectivo", recibido=50000), pago(70000, "transferencia")]
    respuesta = vender(cliente, caja, [item(producto, cantidad=2)], pagos)
    assert respuesta.status_code == 200, respuesta.text
    assert {p["medio"]: p["monto"] for p in respuesta.json()["pagos"]} == {
        "efectivo": 30000,
        "transferencia": 70000,
    }


def test_pagos_que_no_cubren_el_total_dan_422(cliente, caja):
    producto = nuevo_producto(cliente)
    assert vender(cliente, caja, [item(producto)], [pago(40000)]).status_code == 422


def test_recibido_menor_al_monto_da_422(cliente, caja):
    producto = nuevo_producto(cliente)
    respuesta = vender(cliente, caja, [item(producto)], [pago(50000, recibido=20000)])
    assert respuesta.status_code == 422


def test_recibido_en_tarjeta_da_422(cliente, caja):
    producto = nuevo_producto(cliente)
    respuesta = vender(cliente, caja, [item(producto)], [pago(50000, "debito", recibido=50000)])
    assert respuesta.status_code == 422


def test_item_varios_no_toca_stock(cliente, caja):
    respuesta = vender(cliente, caja, [item(None, precio=35000, nombre="Varios")], [pago(35000)])
    assert respuesta.status_code == 200, respuesta.text
    assert respuesta.json()["items"][0]["producto_id"] is None


def test_venta_por_monto_de_producto_por_kg(cliente, caja):
    # "$500 de caramelos" a $12.000/kg: 0,042 kg, que exacto serían $504.
    producto = nuevo_producto(cliente, unidad="kg", codigo_barras=None, precio_venta=1200000)
    items = [item(producto, precio=1200000, cantidad=0.042, subtotal=50000)]
    assert vender(cliente, caja, items, [pago(50000)]).status_code == 200
    assert stock_de(cliente, producto) == -0.042


def test_subtotal_inventado_da_422(cliente, caja):
    producto = nuevo_producto(cliente)
    respuesta = vender(cliente, caja, [item(producto, subtotal=100)], [pago(100)])
    assert respuesta.status_code == 422


def test_producto_inexistente_da_422(cliente, caja):
    fantasma = {"id": str(uuid.uuid4())}
    assert vender(cliente, caja, [item(fantasma)], [pago(50000)]).status_code == 422


def test_caja_inexistente_da_422(cliente):
    caja = {"id": str(uuid.uuid4())}
    assert vender(cliente, caja, [item(None)], [pago(50000)]).status_code == 422

import uuid


def nuevo_producto(cliente, **cambios):
    datos = {
        "nombre": "Alfajor Guaymallén",
        "precio_venta": 50000,
        "codigo_barras": "7790580123456",
    }
    datos.update(cambios)
    producto_id = str(uuid.uuid4())
    respuesta = cliente.put(f"/api/productos/{producto_id}", json=datos)
    assert respuesta.status_code == 200, respuesta.text
    return respuesta.json()


def mover_stock(cliente, producto_id, motivo, cantidad, movimiento_id=None):
    return cliente.post(
        f"/api/productos/{producto_id}/movimientos-stock",
        json={"id": movimiento_id or str(uuid.uuid4()), "motivo": motivo, "cantidad": cantidad},
    )


def test_crear_producto_arranca_sin_stock(cliente):
    producto = nuevo_producto(cliente)
    assert producto["nombre"] == "Alfajor Guaymallén"
    assert producto["precio_venta"] == 50000
    assert producto["stock"] == 0
    assert producto["activo"] is True


def test_guardar_dos_veces_el_mismo_id_actualiza(cliente):
    producto = nuevo_producto(cliente)
    respuesta = cliente.put(
        f"/api/productos/{producto['id']}",
        json={"nombre": "Alfajor triple", "precio_venta": 80000},
    )
    assert respuesta.status_code == 200
    assert respuesta.json()["nombre"] == "Alfajor triple"
    assert len(cliente.get("/api/productos").json()) == 1


def test_normaliza_nombre_y_codigo_vacio(cliente):
    producto = nuevo_producto(cliente, nombre="  Chicle   Beldent ", codigo_barras="  ")
    assert producto["nombre"] == "Chicle Beldent"
    assert producto["codigo_barras"] is None


def test_codigo_repetido_da_409(cliente):
    nuevo_producto(cliente, codigo_barras="123")
    respuesta = cliente.put(
        f"/api/productos/{uuid.uuid4()}",
        json={"nombre": "Otro", "precio_venta": 100, "codigo_barras": "123"},
    )
    assert respuesta.status_code == 409


def test_varios_productos_sin_codigo_conviven(cliente):
    nuevo_producto(cliente, codigo_barras=None, nombre="Caramelo suelto")
    nuevo_producto(cliente, codigo_barras=None, nombre="Chupetín suelto")
    assert len(cliente.get("/api/productos").json()) == 2


def test_precio_negativo_da_422(cliente):
    respuesta = cliente.put(
        f"/api/productos/{uuid.uuid4()}", json={"nombre": "X", "precio_venta": -1}
    )
    assert respuesta.status_code == 422


def test_compra_merma_y_ajuste(cliente):
    producto = nuevo_producto(cliente)
    assert mover_stock(cliente, producto["id"], "compra", 24).json()["stock"] == 24
    assert mover_stock(cliente, producto["id"], "merma", 2).json()["stock"] == 22
    # Ajuste: se contó 20 en la góndola, el movimiento es -2.
    assert mover_stock(cliente, producto["id"], "ajuste", 20).json()["stock"] == 20
    assert cliente.get("/api/productos").json()[0]["stock"] == 20


def test_reintentar_movimiento_no_lo_duplica(cliente):
    producto = nuevo_producto(cliente)
    movimiento_id = str(uuid.uuid4())
    mover_stock(cliente, producto["id"], "compra", 10, movimiento_id)
    respuesta = mover_stock(cliente, producto["id"], "compra", 10, movimiento_id)
    assert respuesta.json()["stock"] == 10


def test_producto_por_unidad_rechaza_fracciones(cliente):
    producto = nuevo_producto(cliente)
    assert mover_stock(cliente, producto["id"], "compra", 1.5).status_code == 422


def test_producto_por_kg_acepta_fracciones(cliente):
    producto = nuevo_producto(cliente, unidad="kg", codigo_barras=None)
    assert mover_stock(cliente, producto["id"], "compra", 1.25).json()["stock"] == 1.25


def test_movimiento_de_producto_inexistente_da_404(cliente):
    assert mover_stock(cliente, uuid.uuid4(), "compra", 1).status_code == 404

def test_leer_kiosko_trae_el_nombre_y_campos_vacios(cliente):
    kiosko = cliente.get("/api/kiosko").json()
    assert kiosko["nombre"]
    assert kiosko["direccion"] is None


def test_guardar_kiosko_normaliza_y_vacio_es_none(cliente):
    respuesta = cliente.put(
        "/api/kiosko",
        json={"nombre": "  Kiosco  Lucho ", "direccion": "Av. Siempreviva 742", "telefono": "  "},
    )
    assert respuesta.status_code == 200
    kiosko = cliente.get("/api/kiosko").json()
    assert kiosko["nombre"] == "Kiosco Lucho"
    assert kiosko["direccion"] == "Av. Siempreviva 742"
    assert kiosko["telefono"] is None


def test_kiosko_sin_nombre_da_422(cliente):
    assert cliente.put("/api/kiosko", json={"nombre": "   "}).status_code == 422

import uuid

import pytest

from tests.test_cajas import cerrar


def guardar_empleado(cliente, nombre, activo=True, empleado_id=None):
    empleado_id = empleado_id or str(uuid.uuid4())
    respuesta = cliente.put(
        f"/api/empleados/{empleado_id}", json={"nombre": nombre, "activo": activo}
    )
    assert respuesta.status_code == 200, respuesta.text
    return respuesta.json()


def guardar_presencia(cliente, caja, empleado, entrada, salida=None, presencia_id=None):
    presencia_id = presencia_id or str(uuid.uuid4())
    return cliente.put(
        f"/api/cajas/{caja['id']}/presencias/{presencia_id}",
        json={"empleado_id": empleado["id"], "entrada": entrada, "salida": salida},
    )


@pytest.fixture
def juan(cliente):
    return guardar_empleado(cliente, "Juan")


def test_empleados_se_listan_por_nombre_con_los_de_baja(cliente):
    guardar_empleado(cliente, "  Marta  Gómez ")
    guardar_empleado(cliente, "Ana", activo=False)
    empleados = cliente.get("/api/empleados").json()
    assert [(e["nombre"], e["activo"]) for e in empleados] == [
        ("Ana", False),
        ("Marta Gómez", True),
    ]


def test_dar_de_baja_es_el_mismo_put(cliente, juan):
    guardar_empleado(cliente, "Juan", activo=False, empleado_id=juan["id"])
    assert cliente.get("/api/empleados").json()[0]["activo"] is False


def test_empleado_sin_nombre_da_422(cliente):
    assert cliente.put(f"/api/empleados/{uuid.uuid4()}", json={"nombre": "  "}).status_code == 422


def test_la_salida_se_carga_reenviando_la_presencia(cliente, caja, juan):
    presencia_id = str(uuid.uuid4())
    entrada = "2026-11-20T08:00:00-03:00"
    guardar_presencia(cliente, caja, juan, entrada, presencia_id=presencia_id)
    respuesta = guardar_presencia(
        cliente, caja, juan, entrada, salida="2026-11-20T11:30:00-03:00", presencia_id=presencia_id
    )
    assert respuesta.status_code == 200
    presencias = cliente.get(f"/api/cajas/{caja['id']}/presencias").json()
    assert len(presencias) == 1
    assert presencias[0]["salida"].startswith("2026-11-20T14:30:00")


def test_salida_antes_de_la_entrada_da_422(cliente, caja, juan):
    respuesta = guardar_presencia(
        cliente, caja, juan, "2026-11-20T10:00:00-03:00", salida="2026-11-20T09:00:00-03:00"
    )
    assert respuesta.status_code == 422


def test_presencia_de_empleado_inexistente_da_404(cliente, caja):
    respuesta = guardar_presencia(
        cliente, caja, {"id": str(uuid.uuid4())}, "2026-11-20T08:00:00-03:00"
    )
    assert respuesta.status_code == 404


def test_cerrar_el_turno_completa_la_salida_de_los_que_siguen(cliente, caja, juan):
    ana = guardar_empleado(cliente, "Ana")
    guardar_presencia(cliente, caja, juan, "2026-11-20T08:00:00-03:00")
    guardar_presencia(
        cliente, caja, ana, "2026-11-20T08:00:00-03:00", salida="2026-11-20T10:00:00-03:00"
    )
    cliente.post(
        f"/api/cajas/{caja['id']}/cerrar",
        json={"monto_contado": 1000000, "cerrada_en": "2026-11-20T14:30:00-03:00"},
    )

    presencias = cliente.get(f"/api/cajas/{caja['id']}").json()["presencias"]
    salidas = {p["empleado_id"]: p["salida"][:16] for p in presencias}
    assert salidas == {juan["id"]: "2026-11-20T17:30", ana["id"]: "2026-11-20T13:00"}


def test_el_historial_trae_las_presencias_de_cada_turno(cliente, caja, juan):
    guardar_presencia(cliente, caja, juan, "2026-11-20T08:00:00-03:00")
    cerrar(cliente, caja, 1000000)
    turno = cliente.get("/api/cajas").json()[0]
    assert [p["empleado_id"] for p in turno["presencias"]] == [juan["id"]]


def test_codigo_admin_se_guarda_como_hash_y_se_puede_quitar(cliente):
    sin_codigo = cliente.get("/api/kiosko").json()
    assert sin_codigo["codigo_admin_hash"] is None

    hash_valido = "a" * 64
    assert cliente.put("/api/kiosko/codigo-admin", json={"hash": hash_valido}).status_code == 200
    assert cliente.get("/api/kiosko").json()["codigo_admin_hash"] == hash_valido

    assert cliente.put("/api/kiosko/codigo-admin", json={"hash": "1234"}).status_code == 422
    assert cliente.put("/api/kiosko/codigo-admin", json={"hash": None}).status_code == 200
    assert cliente.get("/api/kiosko").json()["codigo_admin_hash"] is None

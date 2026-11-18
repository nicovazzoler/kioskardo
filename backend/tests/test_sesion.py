import base64
import json

import pytest

from app import sesion
from app.config import config


@pytest.fixture
def con_clave(monkeypatch):
    monkeypatch.setattr(config, "clave_acceso", "kiosco123")
    monkeypatch.setattr(sesion.time, "sleep", lambda _: None)


def test_sin_clave_configurada_la_api_queda_abierta(cliente):
    assert cliente.get("/api/productos").status_code == 200


def test_con_clave_la_api_pide_token(cliente, con_clave):
    assert cliente.get("/api/productos").status_code == 401
    assert cliente.get("/api/salud").status_code == 200


def test_clave_incorrecta_da_401(cliente, con_clave):
    assert cliente.post("/api/sesion", json={"clave": "otra"}).status_code == 401


def test_con_el_token_se_puede_usar_la_api(cliente, con_clave):
    token = cliente.post("/api/sesion", json={"clave": "kiosco123"}).json()["token"]
    respuesta = cliente.get("/api/productos", headers={"Authorization": f"Bearer {token}"})
    assert respuesta.status_code == 200


def test_cambiar_la_clave_invalida_los_tokens(cliente, con_clave, monkeypatch):
    token = cliente.post("/api/sesion", json={"clave": "kiosco123"}).json()["token"]
    monkeypatch.setattr(config, "clave_acceso", "nueva")
    respuesta = cliente.get("/api/productos", headers={"Authorization": f"Bearer {token}"})
    assert respuesta.status_code == 401


def test_token_vencido_o_trucho_no_vale(con_clave):
    datos = base64.urlsafe_b64encode(json.dumps({"vence": 1}).encode()).decode()
    assert not sesion.token_valido(f"{datos}.{sesion._firmar(datos)}")
    assert not sesion.token_valido("cualquier.cosa")
    assert not sesion.token_valido("sin-punto")

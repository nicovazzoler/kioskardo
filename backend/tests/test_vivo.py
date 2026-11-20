from contextlib import contextmanager

import pytest
from starlette.websockets import WebSocketDisconnect

from app.sesion import crear_token

VENTA = {
    "items": [
        {
            "id": "1",
            "nombre": "Coca-Cola 500 ml",
            "cantidad": "2",
            "detalle": "2 × $1.500",
            "subtotal": 300000,
        }
    ],
    "total": 300000,
    "recibido": 500000,
    "cobrada": None,
}


@pytest.fixture
def entrar(cliente):
    # Con el `with`, todas las conexiones del test comparten un event loop, como en el servidor.
    with cliente:

        @contextmanager
        def conectar(rol, token=None):
            with cliente.websocket_connect("/api/vivo") as ws:
                ws.send_json({"tipo": "hola", "rol": rol, "token": token})
                # Después de la bienvenida el servidor ya lo tiene en la sala: no hay carreras.
                assert ws.receive_json()["tipo"] == "cajas"
                yield ws

        yield conectar


def esperar_al_servidor(ws):
    """Cada conexión se atiende en orden: cuando vuelve el pong, lo anterior ya se procesó."""
    ws.send_json({"tipo": "ping"})
    assert ws.receive_json() == {"tipo": "pong"}


def test_el_codigo_del_escaner_le_llega_a_la_caja(entrar):
    with entrar("caja") as caja, entrar("escaner") as escaner:
        escaner.send_json({"tipo": "codigo", "codigo": "7790895000997"})
        assert caja.receive_json() == {"tipo": "codigo", "codigo": "7790895000997"}


def test_la_venta_le_llega_a_la_pantalla_y_al_escaner(entrar):
    with entrar("pantalla") as pantalla, entrar("escaner") as escaner:
        with entrar("caja") as caja:
            assert pantalla.receive_json() == {"tipo": "cajas", "conectadas": 1}
            assert escaner.receive_json() == {"tipo": "cajas", "conectadas": 1}
            caja.send_json({"tipo": "venta", "venta": VENTA})
            assert pantalla.receive_json() == {"tipo": "venta", "venta": VENTA}
            assert escaner.receive_json() == {"tipo": "venta", "venta": VENTA}


def test_la_pantalla_que_entra_tarde_ve_la_venta_en_curso(entrar):
    with entrar("caja") as caja:
        caja.send_json({"tipo": "venta", "venta": VENTA})
        esperar_al_servidor(caja)
        with entrar("pantalla") as pantalla:
            assert pantalla.receive_json() == {"tipo": "venta", "venta": VENTA}


def test_cuando_se_va_la_ultima_caja_avisa_y_olvida_la_venta(entrar):
    with entrar("pantalla") as pantalla:
        with entrar("caja") as caja:
            caja.send_json({"tipo": "venta", "venta": VENTA})
            assert pantalla.receive_json() == {"tipo": "cajas", "conectadas": 1}
            assert pantalla.receive_json()["tipo"] == "venta"
        assert pantalla.receive_json() == {"tipo": "cajas", "conectadas": 0}

        with entrar("pantalla") as otra:
            esperar_al_servidor(otra)


def test_cada_rol_manda_solo_lo_suyo(entrar):
    with entrar("caja") as caja, entrar("pantalla") as pantalla, entrar("escaner") as escaner:
        pantalla.send_json({"tipo": "codigo", "codigo": "1111"})
        esperar_al_servidor(pantalla)
        escaner.send_json({"tipo": "venta", "venta": VENTA})
        escaner.send_json({"tipo": "codigo", "codigo": "2222"})
        esperar_al_servidor(escaner)

        assert caja.receive_json() == {"tipo": "codigo", "codigo": "2222"}
        esperar_al_servidor(pantalla)


def test_un_mensaje_que_no_se_entiende_no_corta_la_conexion(entrar):
    with entrar("caja") as caja:
        caja.send_text("cualquier cosa")
        caja.send_json({"tipo": "venta", "venta": {"total": -5}})
        esperar_al_servidor(caja)


def test_con_clave_hay_que_mandar_el_token(cliente, con_clave, entrar):
    with cliente.websocket_connect("/api/vivo") as ws:
        ws.send_json({"tipo": "hola", "rol": "pantalla"})
        with pytest.raises(WebSocketDisconnect) as cierre:
            ws.receive_json()
    assert cierre.value.code == 4401

    with entrar("pantalla", token=crear_token()) as pantalla:
        esperar_al_servidor(pantalla)


def test_el_primer_mensaje_tiene_que_ser_hola(cliente):
    with cliente.websocket_connect("/api/vivo") as ws:
        ws.send_json({"tipo": "ping"})
        with pytest.raises(WebSocketDisconnect) as cierre:
            ws.receive_json()
    assert cierre.value.code == 1008

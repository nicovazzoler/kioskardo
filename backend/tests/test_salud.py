from fastapi.testclient import TestClient

from app.main import app


def test_salud_responde_ok():
    respuesta = TestClient(app).get("/api/salud")
    assert respuesta.status_code == 200
    assert respuesta.json() == {"ok": True}

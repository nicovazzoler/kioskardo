import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.frontend import servir_frontend


@pytest.fixture
def cliente(tmp_path):
    (tmp_path / "assets").mkdir()
    (tmp_path / "index.html").write_text("<p>app</p>")
    (tmp_path / "assets" / "app-abc123.js").write_text("console.log(1)")
    (tmp_path.parent / "secreto.txt").write_text("no")
    app = FastAPI()
    servir_frontend(app, tmp_path)
    return TestClient(app)


def test_rutas_de_la_app_devuelven_index_sin_cache(cliente):
    respuesta = cliente.get("/caja")
    assert respuesta.text == "<p>app</p>"
    assert respuesta.headers["cache-control"] == "no-cache"


def test_assets_con_hash_se_cachean(cliente):
    respuesta = cliente.get("/assets/app-abc123.js")
    assert respuesta.text == "console.log(1)"
    assert "immutable" in respuesta.headers["cache-control"]


def test_api_inexistente_da_404_y_no_el_index(cliente):
    assert cliente.get("/api/nada").status_code == 404


def test_no_sale_de_la_carpeta(cliente):
    assert cliente.get("/..%2Fsecreto.txt").text == "<p>app</p>"

import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.db import Base, obtener_sesion
from app.main import app
from app.modelos import Kiosko

URL_TEST = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+psycopg://kioskardo:kioskardo@localhost:5432/kioskardo_test",
)
engine = create_engine(URL_TEST)


@pytest.fixture(scope="session")
def tablas():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield


@pytest.fixture
def sesion(tablas):
    # Cada test corre dentro de una transacción que se deshace al final: la base queda limpia.
    # Los commit() del código pasan a ser savepoints dentro de esa transacción.
    conexion = engine.connect()
    transaccion = conexion.begin()
    sesion = Session(bind=conexion, join_transaction_mode="create_savepoint")
    yield sesion
    sesion.close()
    transaccion.rollback()
    conexion.close()


@pytest.fixture
def kiosko(sesion):
    kiosko = Kiosko(nombre="Kiosko de prueba")
    sesion.add(kiosko)
    sesion.flush()
    return kiosko


@pytest.fixture
def cliente(sesion, kiosko):
    app.dependency_overrides[obtener_sesion] = lambda: sesion
    yield TestClient(app)
    app.dependency_overrides.clear()

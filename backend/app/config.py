import re

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url

HOSTS_LOCALES = {"localhost", "127.0.0.1", "::1"}


class Config(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://kioskardo:kioskardo@localhost:5432/kioskardo"
    # Sin clave la API queda abierta, que sirve para desarrollar. Con base remota es obligatoria.
    clave_acceso: str | None = None
    # Carpeta del frontend compilado (npm run build). Sin ella, el backend sirve solo la API.
    frontend_dist: str | None = None

    @field_validator("database_url")
    @classmethod
    def con_driver_psycopg(cls, url: str) -> str:
        # Railway la da como postgresql:// y SQLAlchemy, sin el "+psycopg", busca otro driver.
        return re.sub(r"^postgres(ql)?://", "postgresql+psycopg://", url)

    @field_validator("clave_acceso", "frontend_dist")
    @classmethod
    def vacio_es_none(cls, valor: str | None) -> str | None:
        return valor or None


def es_base_local(url: str) -> bool:
    return (make_url(url).host or "localhost") in HOSTS_LOCALES


config = Config()

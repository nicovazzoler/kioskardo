"""Sirve el frontend compilado desde el mismo servidor que la API: una sola URL y sin CORS."""

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse

SIN_CACHE = {"Cache-Control": "no-cache"}
# Vite les pone un hash en el nombre: si el archivo cambia, cambia la URL.
PARA_SIEMPRE = {"Cache-Control": "public, max-age=31536000, immutable"}


def servir_frontend(app: FastAPI, carpeta: Path) -> None:
    raiz = carpeta.resolve()

    @app.get("/{ruta:path}", include_in_schema=False)
    def archivo(ruta: str) -> FileResponse:
        if ruta.startswith("api/"):
            raise HTTPException(404)
        pedido = (raiz / ruta).resolve()
        if pedido.is_file() and pedido.is_relative_to(raiz):
            cache = PARA_SIEMPRE if ruta.startswith("assets/") else SIN_CACHE
            return FileResponse(pedido, headers=cache)
        # /caja, /ajustes y el resto no son archivos: las resuelve React Router en el navegador.
        return FileResponse(raiz / "index.html", headers=SIN_CACHE)

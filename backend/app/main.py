from pathlib import Path

from fastapi import Depends, FastAPI

from app.config import config, es_base_local
from app.frontend import servir_frontend
from app.rutas import cajas, empleados, kioskos, productos, sesion, ventas, vivo
from app.sesion import exigir_sesion

if config.clave_acceso is None and not es_base_local(config.database_url):
    raise RuntimeError("Falta CLAVE_ACCESO: sin ella cualquiera con la URL podría usar la API.")

app = FastAPI(title="Kioskardo API")
protegida = [Depends(exigir_sesion)]
app.include_router(productos.router, dependencies=protegida)
app.include_router(cajas.router, dependencies=protegida)
app.include_router(ventas.router, dependencies=protegida)
app.include_router(kioskos.router, dependencies=protegida)
app.include_router(empleados.router, dependencies=protegida)
app.include_router(sesion.router)
# Sin `protegida`: pide la clave en su primer mensaje (ver rutas/vivo.py).
app.include_router(vivo.router)


@app.get("/api/salud")
def salud() -> dict[str, bool]:
    return {"ok": True}


# Va al final: su ruta comodín no tiene que tapar las de la API.
if config.frontend_dist:
    servir_frontend(app, Path(config.frontend_dist))

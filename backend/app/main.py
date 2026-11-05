from fastapi import FastAPI

from app.rutas import cajas, productos, ventas

app = FastAPI(title="Kioskardo API")
app.include_router(productos.router)
app.include_router(cajas.router)
app.include_router(ventas.router)


@app.get("/api/salud")
def salud() -> dict[str, bool]:
    return {"ok": True}

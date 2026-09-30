from fastapi import FastAPI

from app.rutas import productos

app = FastAPI(title="Kioskardo API")
app.include_router(productos.router)


@app.get("/api/salud")
def salud() -> dict[str, bool]:
    return {"ok": True}

from fastapi import FastAPI

app = FastAPI(title="Kioskardo API")


@app.get("/api/salud")
def salud() -> dict[str, bool]:
    return {"ok": True}

# Kioskardo

Punto de venta para kioscos. Funciona en celular, tablet y PC como PWA (web instalable).

## Estructura

```
frontend/   React + TypeScript + Vite + Tailwind (PWA)
backend/    FastAPI + SQLAlchemy + Alembic + PostgreSQL
```

## Requisitos

- Node 22+
- Python 3.11+
- PostgreSQL 16 (propio o con `docker compose up -d`)

## Levantar en desarrollo

### 1. Base de datos

Con Docker:

```bash
docker compose up -d
```

O en un Postgres propio:

```sql
CREATE USER kioskardo PASSWORD 'kioskardo';
CREATE DATABASE kioskardo OWNER kioskardo;
```

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env             # ajustar DATABASE_URL si hace falta
alembic upgrade head             # crea las tablas
python -m app.semilla            # crea el kiosko inicial
uvicorn app.main:app --reload
```

API en http://localhost:8000, documentación en http://localhost:8000/docs.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

App en http://localhost:5173. Las llamadas a `/api` se redirigen al backend.

Para probar desde el celular: conectarlo a la misma red wifi y abrir la dirección
`Network:` que muestra `npm run dev` (por ejemplo `http://192.168.0.10:5173`).

La pantalla para el cliente está en `/pantalla`.

## Comandos útiles

| Qué | Dónde | Comando |
|---|---|---|
| Tests backend | `backend/` | `pytest` |
| Lint backend | `backend/` | `ruff check . && ruff format --check .` |
| Nueva migración | `backend/` | `alembic revision --autogenerate -m "descripción"` |
| Lint frontend | `frontend/` | `npm run lint` |
| Build frontend | `frontend/` | `npm run build` |

## Convenciones del modelo de datos

- **Montos en centavos** (enteros): `150050` = $1.500,50.
- **Ids UUID generados en el cliente**, para poder registrar ventas sin conexión.
- **Stock como movimientos** (`+24` compra, `-2` venta): el stock actual es la suma.
- **Todo lleva `kiosko_id`**, preparado para varios kioscos.

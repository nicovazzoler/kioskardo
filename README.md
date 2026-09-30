# Kioskardo

Punto de venta para kioscos. Funciona en celular, tablet y PC como PWA (web instalable).

Para entender cómo está armado el código: [docs/GUIA.md](docs/GUIA.md).

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
CREATE DATABASE kioskardo_test OWNER kioskardo;  -- para los tests
```

Con Docker, la base de tests se crea con:

```bash
docker compose exec db createdb -U kioskardo kioskardo_test
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

La cámara solo funciona con https. Para probar el escaneo con cámara desde el celular:
`npm run dev:https` y aceptar la advertencia del certificado en el navegador.

La pantalla para el cliente está en `/pantalla`.

## Comandos útiles

| Qué | Dónde | Comando |
|---|---|---|
| Tests backend | `backend/` | `pytest` (usa la base `kioskardo_test`) |
| Tests frontend | `frontend/` | `npm test` |
| Lint backend | `backend/` | `ruff check . && ruff format --check .` |
| Nueva migración | `backend/` | `alembic revision --autogenerate -m "descripción"` |
| Lint frontend | `frontend/` | `npm run lint` |
| Build frontend | `frontend/` | `npm run build` |

## Convenciones del modelo de datos

- **Montos en centavos** (enteros): `150050` = $1.500,50.
- **Ids UUID generados en el cliente**, para poder registrar ventas sin conexión.
- **Stock como movimientos** (`+24` compra, `-2` venta): el stock actual es la suma.
- **Todo lleva `kiosko_id`**, preparado para varios kioscos.

## Offline

El frontend guarda el catálogo en IndexedDB (`frontend/src/lib/db.ts`) y lee siempre de ahí.
Cada cambio se aplica primero local y se encola en `pendientes`; `frontend/src/lib/sincronizacion.ts`
los sube en orden cada 15 segundos o al volver la conexión. Los endpoints son idempotentes
(el id lo genera el cliente), así que reenviar un pendiente no duplica nada.

# Kioskardo

Punto de venta para kioscos. Funciona en celular, tablet y PC como PWA (web instalable) y sigue
vendiendo sin conexión: cuando vuelve internet, sincroniza solo.

> **Estado: en desarrollo.** Las fases 1 a 5 están terminadas y probadas. La impresión de tickets
> (fase 6) está hecha pero falta probarla con la impresora real.

## Qué hace

- **Venta:** escaneo con pistola lectora o con la cámara del celular, búsqueda en todo el catálogo
  sin importar tildes, y los productos agrupados por categoría para tocarlos. Productos por peso
  ("$500 de caramelos"), de precio libre (fiambre: se tipea el monto de la balanza) e ítems
  "Varios". Se cobra con un toque eligiendo el medio de pago; el "¿con cuánto paga?" para el vuelto
  es opcional. Hasta dos medios de pago en una venta.
- **Inventario:** alta rápida escaneando el código, stock calculado a partir de movimientos (compra,
  merma, ajuste) y margen de ganancia por producto.
- **Turnos y caja:** el turno es la caja: se abre con el efectivo del cajón y marcando quiénes
  trabajan. Durante el turno se suma al que entra tarde o se anota al que se va antes; ingresos y
  egresos de efectivo, anulación de ventas. Al cerrar se hace el arqueo (contado contra esperado),
  se ven las horas de cada uno y se puede abrir el turno siguiente con la plata contada.
- **Admin:** detrás de un código de 4 números, sin usuarios. Historial de turnos y horas por
  empleado (semana, mes, mes anterior), empleados, datos del negocio y el código. El mismo código
  se pide para anular una venta o cambiar el precio de un producto.
- **Ticket:** vista previa después de cada venta y desde la caja, impresión en comandera térmica
  Bluetooth de 58 u 80 mm a través de la app RawBT. Los datos del negocio se cargan en Admin.
- **Otros dispositivos, en vivo:** una pantalla para el cliente que muestra la venta mientras se
  arma, el total y el vuelto; y un celu que escanea con la cámara y suma los productos a la venta
  de la tablet. Se eligen en Ajustes o manteniendo apretado el ícono de la app instalada.
- **Offline:** todo se guarda primero en el dispositivo y se sube al servidor cuando hay conexión.

## Pendiente

- **Fase 6:** probar el ticket con la impresora que compre el kiosco (acentos, ancho, corte).
- Más adelante: panel para un dueño con varios kioscos.

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
python -m app.sembrador          # datos de muestra, opcional (ver más abajo)
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

La pantalla para el cliente está en `/pantalla` y el escáner para el celu en `/escaner`. Para
probarlos, abrir la venta (`/`) en otra pestaña o dispositivo: se conectan con ella en vivo.

### 4. Datos de muestra

Recién instalada la app queda vacía: $0 y ningún movimiento. Para verla con un kiosco andando
(capturas, demos, probar a mano) hay un sembrador:

```bash
cd backend
python -m app.sembrador            # sobre una base vacía
python -m app.sembrador --rehacer  # borra productos, ventas y cajas, y siembra de nuevo
```

Deja 25 productos con código de barras, precio, costo y stock, una semana de ventas con todos
los medios de pago, seis cajas cerradas con arqueo y la de hoy abierta, y cuatro empleados con
sus horas en cada turno. Los datos son inventados
y siempre los mismos: la semilla del azar está fija, así que dos corridas dan lo mismo.

Escribe en la base que diga `DATABASE_URL` y, si no apunta a `localhost`, se niega a correr.

## Deploy

En Railway, con el `Dockerfile` de la raíz.
Backups diarios de la base con GitHub Actions: [backup/LEEME.md](backup/LEEME.md).

En desarrollo la API no pide clave. Para probar la pantalla de ingreso, agregar
`CLAVE_ACCESO=una-clave` en `backend/.env`.

## Comandos útiles

| Qué | Dónde | Comando |
|---|---|---|
| Tests backend | `backend/` | `pytest` (usa la base `kioskardo_test`) |
| Datos de muestra | `backend/` | `python -m app.sembrador` (`--rehacer` para reemplazarlos) |
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

## En vivo

La caja, la pantalla del cliente y el escáner del celu se conectan por un WebSocket (`/api/vivo`).
El servidor arma una sala por kiosko y reparte los mensajes: la caja manda el estado de la venta
a la pantalla y al celu, y el celu le manda a la caja los códigos que escanea. El código está en
`backend/app/vivo.py` y `frontend/src/lib/vivo.ts`.

- Necesita internet en los dispositivos. Sin conexión la caja vende igual; la pantalla y el
  escáner avisan y se reconectan solos cuando vuelve.
- Las salas viven en la memoria del servidor: funciona con un solo proceso de uvicorn (como
  arranca el `Dockerfile`). Con varios haría falta repartir los mensajes entre procesos (Redis).
- El escáner usa el lector de códigos de Chrome en Android, igual que la cámara en la venta.

## Turnos y horas

- Un turno es una caja: un solo cajón para todos los que trabajan en él. No se anota quién hizo
  cada venta, solo quién estaba.
- Cada empleado tiene una presencia por turno, con entrada y salida. Las horas son la suma de
  esas presencias; al cerrar el turno, el que seguía adentro sale a la hora del cierre.
- Todo se muestra en hora de Argentina (UTC−3), aunque el dispositivo tenga otra zona.
- El código de admin se guarda como SHA-256 y viaja a cada dispositivo para poder pedirlo sin
  conexión. Es un freno para que nadie anule o cambie precios sin querer, no seguridad: con 4
  números alcanza con probar. Si se olvida, se quita desde la base:
  `UPDATE kioskos SET codigo_admin_hash = NULL;`

## Offline

El frontend guarda el catálogo en IndexedDB (`frontend/src/lib/db.ts`) y lee siempre de ahí.
Cada cambio se aplica primero local y se encola en `pendientes`; `frontend/src/lib/sincronizacion.ts`
los sube en orden cada 15 segundos o al volver la conexión. Los endpoints son idempotentes
(el id lo genera el cliente), así que reenviar un pendiente no duplica nada.

# Cómo leer este código

Son unas 3.000 líneas repartidas en ~50 archivos. No hace falta leerlas todas ni en orden
alfabético: la forma más rápida de entenderlas es **seguir una acción de punta a punta** y
después ir llenando los huecos.

## 1. El mapa

```
 NAVEGADOR (celular / tablet / PC)                         SERVIDOR
┌──────────────────────────────────────────────┐        ┌──────────────────────────┐
│  pages/        pantallas completas           │        │  rutas/    endpoints     │
│  components/   pedazos de pantalla           │        │  esquemas  validación    │
│  hooks/        lógica reutilizable de React  │        │  modelos   tablas        │
│      │                                       │        │      │                   │
│      ▼                                       │  HTTP  │      ▼                   │
│  lib/          lógica sin React              │───────▶│  PostgreSQL              │
│      │                                       │  /api  │                          │
│      ▼                                       │        └──────────────────────────┘
│  IndexedDB     base local (Dexie)            │
└──────────────────────────────────────────────┘
```

La regla que ordena el frontend: **la pantalla nunca habla con el servidor.** Lee y escribe
en IndexedDB, y `lib/sincronizacion.ts` se encarga de subir y bajar en segundo plano. Por eso
la app funciona sin internet.

| Carpeta | Qué hay | Pregunta que responde |
|---|---|---|
| `frontend/src/pages/` | Una pantalla por sección | ¿Qué ve el usuario? |
| `frontend/src/components/` | Modales, formularios, campos | ¿Cómo está armada cada parte? |
| `frontend/src/hooks/` | `useCarrito`, `useEscaner` | ¿Qué lógica usa React? |
| `frontend/src/lib/` | Funciones TypeScript puras | ¿Qué reglas tiene el negocio? |
| `backend/app/rutas/` | Endpoints de FastAPI | ¿Qué acepta el servidor? |
| `backend/app/esquemas.py` | Modelos Pydantic | ¿Qué datos son válidos? |
| `backend/app/modelos.py` | Tablas SQLAlchemy | ¿Cómo se guarda? |
| `backend/tests/` | Tests | ¿Qué tiene que pasar en cada caso? |

## 2. El recorrido de una venta

Abrí estos archivos en este orden, en el editor, siguiendo la acción. Cada paso dice qué
buscar.

**1. Se escanea un código.** `frontend/src/hooks/useEscaner.ts`
La pistola "tipea" rápido y manda Enter. Este hook escucha el teclado y distingue a la
pistola de una persona por la velocidad entre teclas. Fijate en `MAX_MS_ENTRE_TECLAS`.

**2. La pantalla recibe el código.** `frontend/src/pages/VentaPage.tsx`
- `useEscaner(procesarCodigo, ...)` (línea 82) conecta el hook con la pantalla.
- `procesarCodigo` (línea 74) busca el producto en IndexedDB.
- `agregar` (línea 66) decide: si se vende por kg abre el modal de peso; si no, lo suma al carrito.

**3. Se suma al carrito.** `frontend/src/hooks/useCarrito.ts`
`agregarProducto` (línea 34): si el producto ya está en el carrito, suma 1; si no, crea una
línea. Mirá cómo **nunca modifica** el array: siempre crea uno nuevo (`[...actuales, nuevo]`,
`.map`, `.filter`). En React eso es obligatorio para que se note el cambio.

**4. Se cobra.** `frontend/src/components/venta/ModalCobro.tsx`
Tiene dos variantes, `PagoSimple` y `PagoDividido`. Las dos terminan en `alConfirmar(pagos)`:
el modal **no sabe** qué pasa después; eso lo decide quien lo abrió.

**5. Se registra la venta.** `VentaPage.tsx` → `cobrar` (línea 93) → `frontend/src/lib/ventas.ts` → `registrarVenta` (línea 15)
- Guarda la venta en IndexedDB y descuenta el stock local. La pantalla se actualiza al instante.
- Llama a `encolar(...)`: todavía no se mandó nada al servidor.

**6. Se sube al servidor.** `frontend/src/lib/sincronizacion.ts`
- `encolar` (línea 9) agrega un registro a la tabla `pendientes`.
- `subirPendientes` (línea 33) los manda en orden. Si falla la red, corta y reintenta a los 15 s.
- Si el servidor responde 4xx (datos inválidos), no reintenta: lo marca con error.

**7. El servidor valida.** `backend/app/esquemas.py` → `VentaCrear` (línea 116)
Pydantic valida antes de que llegue a tu código: que haya ítems, que los subtotales cierren
y que los pagos sumen el total (`pagos_cubren_el_total`, línea 127). Si algo falla, FastAPI
responde 422 solo.

**8. El servidor guarda.** `backend/app/rutas/ventas.py` → `registrar_venta` (línea 22)
- Si la venta ya existe, la devuelve (es un reintento).
- Crea la venta, sus ítems y pagos, y un `MovimientoStock` negativo por cada producto.

**9. Se verifica.** `backend/tests/test_ventas.py`
Cada test es un caso concreto con nombre en castellano. Leé solo los nombres de las
funciones: son la especificación de lo que tiene que pasar.

Si entendiste estos 9 pasos, entendiste el 70% de la app. El inventario sigue exactamente
el mismo camino: `InventarioPage` → `FormularioProducto` → `lib/productos.ts` → `encolar` →
`rutas/productos.py`.

## 3. Orden de lectura sugerido

Una sesión por etapa. En cada una, leé los archivos y tratá de responder las preguntas
sin mirar esta guía.

### Etapa 1: el backend (lo que ya conocés)
`modelos.py` → `esquemas.py` → `rutas/productos.py` → `rutas/ventas.py` → `tests/conftest.py`

- ¿Por qué los montos son `BigInteger` y no `Numeric`?
- ¿Cómo se calcula el stock de un producto si no hay columna `stock`?
- ¿Qué pasa si el mismo `PUT /api/ventas/{id}` llega dos veces?
- En `conftest.py`, ¿cómo se logra que cada test arranque con la base vacía?

### Etapa 2: TypeScript sin React
`lib/modelos.ts` → `lib/dinero.ts` (+ su `.test.ts`) → `lib/db.ts` → `lib/sincronizacion.ts`

- `modelos.ts` es el espejo de `esquemas.py`. ¿Qué diferencias encontrás?
- ¿Qué devuelve `parsearPesos("1.500")`? ¿Y `parsearPesos("1.5")`? ¿Por qué?
- ¿Qué pasa con un pendiente si el servidor está caído? ¿Y si responde 409?

### Etapa 3: React
`main.tsx` → `layouts/AppLayout.tsx` → `components/EstadoConexion.tsx` → `components/Modal.tsx` → `hooks/useCarrito.ts`

- ¿Qué componente se dibuja en `/pantalla` y por qué no tiene menú?
- En `EstadoConexion`, ¿qué hace la función que devuelve `useEffect`?
- ¿Por qué `useCarrito` usa `setItems((actuales) => ...)` en vez de `setItems([...items, x])`?

### Etapa 4: las pantallas completas
`pages/InventarioPage.tsx` → `components/inventario/FormularioProducto.tsx` → `pages/VentaPage.tsx`

Son los archivos más largos. Leelos **de abajo hacia arriba**: primero el JSX (lo que se
dibuja) y después las funciones que usa. Es más fácil entender `agregar` cuando ya viste
qué botón la llama.

### Qué no hace falta leer
`package-lock.json`, `alembic/versions/*` (los genera Alembic), `tsconfig*.json`,
`.oxlintrc.json`, `public/` (íconos) e `index.css`.

## 4. Mirar la app por dentro

Leer código es la mitad; la otra mitad es verlo funcionar.

| Herramienta | Cómo | Qué ves |
|---|---|---|
| **Swagger** | http://localhost:8000/docs | Todos los endpoints. Podés probarlos desde ahí con "Try it out". |
| **IndexedDB** | Chrome → F12 → Application → IndexedDB → kioskardo | Los productos, ventas y pendientes guardados en el navegador. |
| **Red** | F12 → Network → filtrar `api` | Cada request que sale. Poné "Offline" arriba y mirá cómo se acumulan los pendientes. |
| **React DevTools** | Extensión de Chrome | El árbol de componentes y el estado de cada uno (ej: el carrito dentro de `PuntoDeVenta`). |
| **Postgres** | `psql -U kioskardo kioskardo` | `select * from movimientos_stock;` después de una venta. |
| **Tests** | `pytest -v` / `npm test` | Rompé algo a propósito y mirá qué test falla. |

Un ejercicio que conviene hacer una vez: hacé una venta con Network en "Offline", mirá el
pendiente en IndexedDB, volvé a "Online" y mirá cómo sale el `PUT` y desaparece el pendiente.

## 5. Ejercicios para aprender modificando

Ordenados de menor a mayor dificultad. Cada uno toca una sola capa.

1. **Texto.** En `ModalCobro.tsx`, cambiá "Confirmar venta" por "Cobrar". Mirá cómo se
   actualiza sin recargar (eso es el *hot reload* de Vite).
2. **Constante.** En `lib/mediosPago.ts`, agregá el billete de $500 a `BILLETES`. Actualizá
   el test que se rompe.
3. **Estilo.** En `VentaPage.tsx`, hacé que el total se ponga rojo si supera $50.000
   (pista: una clase condicional como la de `tieneStockBajo` en `InventarioPage`).
4. **Validación backend.** Que el nombre de un producto no pueda tener menos de 2 letras.
   Tocá `esquemas.py` y agregá un test en `test_productos.py`.
5. **Componente nuevo.** En Inventario, mostrá arriba de la lista cuántos productos hay y
   cuántos tienen stock bajo (pista: se calcula a partir de `productos`, no hace falta estado nuevo).
6. **Campo nuevo de punta a punta.** Agregá "categoría" (texto opcional) a los productos:
   `modelos.py` → migración con `alembic revision --autogenerate` → `esquemas.py` →
   `lib/modelos.ts` → `FormularioProducto.tsx`. Es el ejercicio que más enseña, porque pasa
   por todas las capas.

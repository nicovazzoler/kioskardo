## Comentarios en el código

Regla: el código se explica solo. Un comentario existe solo si dice algo que el código no dice.

Permitido:
- Una línea arriba de una función que no es obvia, diciendo qué hace.
- El porqué de algo que parece un error o una decisión rara.
- Un caso borde que no se ve leyendo.

Prohibido:
- Historia: "antes pasaba X", "se arregló porque", "ahora usamos Y en vez de Z". Eso va en el commit.
- Repetir lo que dice el nombre de la función o la línea de abajo.
- Comentarios de más de 3 líneas. Si hace falta más, la función hace dos cosas: partila.
- Comentar cada paso de una función.

### Historia

Mal:
```python
# Antes la venta se insertaba después de los movimientos y fallaba la foreign key,
# por eso ahora hacemos flush acá.
# Hacemos flush de la sesión
sesion.flush()
```

Bien:
```python
# MovimientoStock no tiene relationship con Venta, así que SQLAlchemy no sabe que la venta
# tiene que insertarse primero: el flush la manda a la base antes que los movimientos.
sesion.flush()
```

### Repetir el nombre o la línea de abajo

Mal:
```ts
// Descarta los cambios rechazados y vuelve a traer el catálogo del servidor.
export async function descartarRechazados() {
```

Bien (solo lo que el nombre no dice):
```ts
// Vuelve a traer el catálogo para deshacer lo que se había aplicado localmente.
export async function descartarRechazados() {
```

Mal (explica qué hace `useMemo`, no este código):
```ts
// useMemo: recalcula la lista filtrada solo si cambian los productos, la búsqueda o el filtro.
const visibles = useMemo(() => { ... }, [productos, busqueda, filtro])
```

Bien: sin comentario.

### Más de 3 líneas

Mal:
```python
"""Totales de una caja. Las ventas anuladas no cuentan.

El frontend hace la misma cuenta con sus datos locales (frontend/src/lib/resumenCaja.ts)
para mostrarla sin conexión: si cambia una, hay que cambiar la otra.
"""
```

Bien:
```python
"""Las ventas anuladas no cuentan. frontend/src/lib/resumenCaja.ts hace la misma cuenta
para funcionar sin conexión: si cambia una, hay que cambiar la otra.
"""
```

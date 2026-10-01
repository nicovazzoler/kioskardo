import { ErrorApi, pedirApi } from './api'
import { db, type Pendiente } from './db'
import type { Caja, MovimientoCaja, Producto, Venta } from './modelos'

const INTERVALO_MS = 15_000

let enCurso: Promise<void> | null = null

export async function encolar(
  metodo: Pendiente['metodo'],
  ruta: string,
  cuerpo: unknown,
  destino: Pendiente['destino'],
) {
  await db.pendientes.add({ metodo, ruta, cuerpo, destino, creado_en: new Date().toISOString() })
  void sincronizar()
}

// Sube los pendientes en orden y, si no queda ninguno, baja los datos actualizados.
// Si ya hay una sincronización corriendo, devuelve esa misma en vez de arrancar otra.
export function sincronizar(): Promise<void> {
  enCurso ??= subirPendientes()
    .then((quedanPendientes) => (quedanPendientes ? undefined : bajarDatos()))
    .catch(() => {
      // Sin conexión o servidor caído: se reintenta en el próximo ciclo.
    })
    .finally(() => {
      enCurso = null
    })
  return enCurso
}

async function subirPendientes(): Promise<boolean> {
  const pendientes = await db.pendientes.filter((p) => !p.error).sortBy('seq')
  for (const pendiente of pendientes) {
    try {
      const respuesta = await pedirApi<never>(pendiente.ruta, {
        method: pendiente.metodo,
        body: JSON.stringify(pendiente.cuerpo),
      })
      const tabla = db[pendiente.destino]
      await db.transaction('rw', tabla, db.pendientes, async () => {
        await tabla.put(respuesta)
        await db.pendientes.delete(pendiente.seq!)
      })
    } catch (error) {
      const esRechazo = error instanceof ErrorApi && error.status >= 400 && error.status < 500
      if (!esRechazo) throw error
      await db.pendientes.update(pendiente.seq!, { error: extraerMensaje(error) })
    }
  }
  return (await db.pendientes.filter((p) => !p.error).count()) > 0
}

async function bajarDatos() {
  const [productos, caja] = await Promise.all([
    pedirApi<Producto[]>('/productos'),
    pedirApi<Caja | null>('/cajas/abierta'),
  ])
  // Localmente se guardan solo las ventas y movimientos de la caja abierta.
  const [ventas, movimientos] = caja
    ? await Promise.all([
        pedirApi<Venta[]>(`/cajas/${caja.id}/ventas`),
        pedirApi<MovimientoCaja[]>(`/cajas/${caja.id}/movimientos`),
      ])
    : [[], []]

  const tablas = [db.productos, db.cajas, db.ventas, db.movimientosCaja, db.pendientes]
  await db.transaction('rw', tablas, async () => {
    // Si mientras bajaban los datos se hizo un cambio local, no se pisa: se baja en el próximo ciclo.
    if ((await db.pendientes.filter((p) => !p.error).count()) > 0) return
    await db.productos.clear()
    await db.productos.bulkPut(productos)
    // Localmente solo interesa la caja abierta; si se cerró en otro dispositivo, desaparece.
    await db.cajas.clear()
    if (caja) await db.cajas.put(caja)
    await db.ventas.clear()
    await db.ventas.bulkPut(ventas)
    await db.movimientosCaja.clear()
    await db.movimientosCaja.bulkPut(movimientos)
  })
}

// Los errores de FastAPI vienen como {"detail": "..."} o, en validaciones, {"detail": [...]}.
function extraerMensaje(error: ErrorApi): string {
  try {
    const { detail } = JSON.parse(error.message)
    return typeof detail === 'string' ? detail : 'Datos inválidos'
  } catch {
    return error.message
  }
}

// Descarta los cambios rechazados y vuelve a traer el catálogo del servidor.
export async function descartarRechazados() {
  await db.pendientes.filter((p) => !!p.error).delete()
  await sincronizar()
}

export function iniciarSincronizacion() {
  void sincronizar()
  setInterval(() => void sincronizar(), INTERVALO_MS)
  window.addEventListener('online', () => void sincronizar())
}

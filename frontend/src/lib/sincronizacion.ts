import { ErrorApi, pedirApi } from './api'
import { db, type Pendiente } from './db'
import type { Producto } from './modelos'

const INTERVALO_MS = 15_000

let enCurso: Promise<void> | null = null

export async function encolar(metodo: Pendiente['metodo'], ruta: string, cuerpo: unknown) {
  await db.pendientes.add({ metodo, ruta, cuerpo, creado_en: new Date().toISOString() })
  void sincronizar()
}

// Sube los pendientes en orden y, si no queda ninguno, baja el catálogo actualizado.
// Si ya hay una sincronización corriendo, devuelve esa misma en vez de arrancar otra.
export function sincronizar(): Promise<void> {
  enCurso ??= subirPendientes()
    .then((quedanPendientes) => (quedanPendientes ? undefined : bajarProductos()))
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
      // Todos los endpoints encolables devuelven el producto actualizado.
      const producto = await pedirApi<Producto>(pendiente.ruta, {
        method: pendiente.metodo,
        body: JSON.stringify(pendiente.cuerpo),
      })
      await db.transaction('rw', db.productos, db.pendientes, async () => {
        await db.productos.put(producto)
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

async function bajarProductos() {
  const productos = await pedirApi<Producto[]>('/productos')
  await db.transaction('rw', db.productos, db.pendientes, async () => {
    // Si mientras bajaba el catálogo se hizo un cambio local, no se pisa: se baja en el próximo ciclo.
    if ((await db.pendientes.filter((p) => !p.error).count()) > 0) return
    await db.productos.clear()
    await db.productos.bulkPut(productos)
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

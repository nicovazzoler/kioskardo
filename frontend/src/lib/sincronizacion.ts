import { ErrorApi, pedirApi } from './api'
import { db, type Pendiente } from './db'
import type { Caja, Empleado, Kiosko, MovimientoCaja, Presencia, Producto, Venta } from './modelos'

const INTERVALO_MS = 15_000

let enCurso: Promise<void> | null = null
let repetir = false

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
// Si ya hay una corriendo, devuelve esa y se repite al terminar: lo encolado mientras tanto no espera al próximo ciclo.
export function sincronizar(): Promise<void> {
  if (enCurso) {
    repetir = true
    return enCurso
  }
  enCurso = subirPendientes()
    .then((quedanPendientes) => (quedanPendientes ? undefined : bajarDatos()))
    .catch(() => {
      // Sin conexión o servidor caído: se reintenta en el próximo ciclo.
    })
    .finally(() => {
      enCurso = null
      if (repetir) {
        repetir = false
        void sincronizar()
      }
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
      // Un 401 no es un rechazo de los datos: falta la clave, y se vuelve a intentar después de ingresarla.
      const esRechazo = error instanceof ErrorApi && error.status >= 400 && error.status < 500 && error.status !== 401
      if (!esRechazo) throw error
      await db.pendientes.update(pendiente.seq!, { error: extraerMensaje(error) })
    }
  }
  return (await db.pendientes.filter((p) => !p.error).count()) > 0
}

async function bajarDatos() {
  const [kiosko, productos, empleados, caja] = await Promise.all([
    pedirApi<Kiosko>('/kiosko'),
    pedirApi<Producto[]>('/productos'),
    pedirApi<Empleado[]>('/empleados'),
    pedirApi<Caja | null>('/cajas/abierta'),
  ])
  // Localmente se guardan solo las ventas, movimientos y presencias de la caja abierta.
  const [ventas, movimientos, presencias] = caja
    ? await Promise.all([
        pedirApi<Venta[]>(`/cajas/${caja.id}/ventas`),
        pedirApi<MovimientoCaja[]>(`/cajas/${caja.id}/movimientos`),
        pedirApi<Presencia[]>(`/cajas/${caja.id}/presencias`),
      ])
    : [[], [], []]

  const tablas = [db.kiosko, db.productos, db.empleados, db.cajas, db.ventas, db.movimientosCaja, db.presencias, db.pendientes]
  await db.transaction('rw', tablas, async () => {
    // Si mientras bajaban los datos se hizo un cambio local, no se pisa: se baja en el próximo ciclo.
    if ((await db.pendientes.filter((p) => !p.error).count()) > 0) return
    await db.kiosko.put(kiosko)
    await db.productos.clear()
    await db.productos.bulkPut(productos)
    await db.empleados.clear()
    await db.empleados.bulkPut(empleados)
    // Localmente solo interesa la caja abierta; si se cerró en otro dispositivo, desaparece.
    await db.cajas.clear()
    if (caja) await db.cajas.put(caja)
    await db.ventas.clear()
    await db.ventas.bulkPut(ventas)
    await db.movimientosCaja.clear()
    await db.movimientosCaja.bulkPut(movimientos)
    await db.presencias.clear()
    await db.presencias.bulkPut(presencias)
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

// Vuelve a traer el catálogo para deshacer lo que se había aplicado localmente.
export async function descartarRechazados() {
  await db.pendientes.filter((p) => !!p.error).delete()
  await sincronizar()
}

export function iniciarSincronizacion() {
  void sincronizar()
  setInterval(() => void sincronizar(), INTERVALO_MS)
  window.addEventListener('online', () => void sincronizar())
}

import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import type { Caja, MovimientoCaja } from './modelos'
import { encolar } from './sincronizacion'
import { sumarAlTurno } from './turnos'
import { nuevoId } from './uuid'

// undefined mientras carga, null si no hay caja abierta.
export function useCajaAbierta(): Caja | null | undefined {
  return useLiveQuery(async () => (await db.cajas.filter((c) => c.cerrada_en === null).first()) ?? null, [])
}

const CLAVE_ULTIMO_CONTADO = 'kioskardo:ultimo-contado'

export async function abrirCaja(montoInicial: number, empleadoIds: string[] = []) {
  const caja: Caja = {
    id: nuevoId(),
    abierta_en: new Date().toISOString(),
    cerrada_en: null,
    monto_inicial: montoInicial,
    monto_contado: null,
    nota: null,
  }
  await db.cajas.put(caja)
  await encolar('PUT', `/cajas/${caja.id}`, { monto_inicial: montoInicial, abierta_en: caja.abierta_en }, 'cajas')
  for (const empleadoId of empleadoIds) await sumarAlTurno(caja.id, empleadoId, caja.abierta_en)
}

export async function registrarMovimiento(cajaId: string, tipo: MovimientoCaja['tipo'], monto: number, motivo: string) {
  const movimiento: MovimientoCaja = { id: nuevoId(), caja_id: cajaId, tipo, monto, motivo, creado_en: new Date().toISOString() }
  await db.movimientosCaja.put(movimiento)
  const { caja_id: _cajaId, ...cuerpo } = movimiento
  await encolar('POST', `/cajas/${cajaId}/movimientos`, cuerpo, 'movimientosCaja')
}

// El servidor completa la salida de los que siguen en el turno; acá se hace lo mismo localmente.
export async function cerrarCaja(caja: Caja, montoContado: number, nota: string | null): Promise<Caja> {
  const cerrada: Caja = { ...caja, cerrada_en: new Date().toISOString(), monto_contado: montoContado, nota }
  await db.cajas.put(cerrada)
  await db.presencias.where('caja_id').equals(caja.id).filter((p) => p.salida === null).modify({ salida: cerrada.cerrada_en })
  try {
    localStorage.setItem(CLAVE_ULTIMO_CONTADO, String(montoContado))
  } catch {
    // Sin almacenamiento no hay sugerencia para el turno siguiente: no es grave.
  }
  await encolar('POST', `/cajas/${caja.id}/cerrar`, { monto_contado: montoContado, nota, cerrada_en: cerrada.cerrada_en }, 'cajas')
  return cerrada
}

// Lo que se contó al cerrar el último turno en este dispositivo: es con lo que arranca el siguiente.
export function leerUltimoContado(): number | null {
  try {
    const guardado = localStorage.getItem(CLAVE_ULTIMO_CONTADO)
    return guardado === null ? null : Number(guardado)
  } catch {
    return null
  }
}

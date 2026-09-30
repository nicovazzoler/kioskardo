import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import type { Caja } from './modelos'
import { encolar } from './sincronizacion'
import { nuevoId } from './uuid'

// undefined mientras carga, null si no hay caja abierta.
export function useCajaAbierta(): Caja | null | undefined {
  return useLiveQuery(async () => (await db.cajas.filter((c) => c.cerrada_en === null).first()) ?? null, [])
}

export async function abrirCaja(montoInicial: number) {
  const caja: Caja = {
    id: nuevoId(),
    abierta_en: new Date().toISOString(),
    cerrada_en: null,
    monto_inicial: montoInicial,
    monto_contado: null,
  }
  await db.cajas.put(caja)
  await encolar('PUT', `/cajas/${caja.id}`, { monto_inicial: montoInicial, abierta_en: caja.abierta_en }, 'cajas')
}

import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import type { KioskoGuardar } from './modelos'
import { encolar } from './sincronizacion'

// undefined hasta que llega la primera sincronización con el servidor.
export function useKiosko() {
  return useLiveQuery(() => db.kiosko.toCollection().first(), [])
}

export async function guardarKiosko(id: string, datos: KioskoGuardar) {
  await db.kiosko.update(id, datos)
  await encolar('PUT', '/kiosko', datos, 'kiosko')
}

import { useSyncExternalStore } from 'react'
import { db } from './db'
import type { Kiosko } from './modelos'
import { encolar } from './sincronizacion'

export const LARGO_CODIGO = 4

// Es un freno para los empleados, no seguridad: el hash viaja a cada dispositivo para poder
// pedir el código sin conexión, y 4 dígitos se adivinan probando las 10.000 combinaciones.
export async function hashearCodigo(kioskoId: string, codigo: string): Promise<string> {
  // crypto.subtle solo existe con https o en localhost.
  if (!crypto.subtle) throw new Error('El código necesita que la app se abra con https')
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${kioskoId}:${codigo}`))
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function codigoCorrecto(kiosko: Kiosko, codigo: string): Promise<boolean> {
  return kiosko.codigo_admin_hash !== null && (await hashearCodigo(kiosko.id, codigo)) === kiosko.codigo_admin_hash
}

// null quita el código: Admin queda abierto para cualquiera.
export async function guardarCodigoAdmin(kiosko: Kiosko, codigo: string | null) {
  const hash = codigo === null ? null : await hashearCodigo(kiosko.id, codigo)
  await db.kiosko.update(kiosko.id, { codigo_admin_hash: hash })
  await encolar('PUT', '/kiosko/codigo-admin', { hash }, 'kiosko')
}

// Vive en memoria: al recargar la página o salir de Admin se vuelve a pedir el código.
let desbloqueado = false
const oyentes = new Set<() => void>()

export function useAdminDesbloqueado(): boolean {
  return useSyncExternalStore(
    (oyente) => {
      oyentes.add(oyente)
      return () => oyentes.delete(oyente)
    },
    () => desbloqueado,
  )
}

export function cambiarDesbloqueo(valor: boolean) {
  desbloqueado = valor
  oyentes.forEach((oyente) => oyente())
}

import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import { minutosEntre } from './fechas'
import type { Presencia } from './modelos'
import { encolar } from './sincronizacion'
import { nuevoId } from './uuid'

export function usePresencias(cajaId: string | undefined) {
  return useLiveQuery(() => (cajaId ? db.presencias.where('caja_id').equals(cajaId).sortBy('entrada') : []), [cajaId])
}

export async function sumarAlTurno(cajaId: string, empleadoId: string, entrada = new Date().toISOString()) {
  await guardarPresencia({ id: nuevoId(), caja_id: cajaId, empleado_id: empleadoId, entrada, salida: null })
}

export async function marcarSalida(presencia: Presencia) {
  await guardarPresencia({ ...presencia, salida: new Date().toISOString() })
}

async function guardarPresencia(presencia: Presencia) {
  await db.presencias.put(presencia)
  const { id, caja_id, ...cuerpo } = presencia
  await encolar('PUT', `/cajas/${caja_id}/presencias/${id}`, cuerpo, 'presencias')
}

export function minutosEnTurno(presencia: Presencia, ahora: Date): number {
  return minutosEntre(presencia.entrada, presencia.salida ? new Date(presencia.salida) : ahora)
}

// Minutos trabajados y en cuántos turnos estuvo cada empleado. Las presencias sin salida cuentan hasta `ahora`.
export function horasPorEmpleado(presencias: Presencia[], ahora: Date): Map<string, { minutos: number; turnos: number }> {
  const minutos = new Map<string, number>()
  const turnos = new Map<string, Set<string>>()
  for (const presencia of presencias) {
    minutos.set(presencia.empleado_id, (minutos.get(presencia.empleado_id) ?? 0) + minutosEnTurno(presencia, ahora))
    if (!turnos.has(presencia.empleado_id)) turnos.set(presencia.empleado_id, new Set())
    turnos.get(presencia.empleado_id)!.add(presencia.caja_id)
  }
  return new Map([...minutos].map(([id, total]) => [id, { minutos: total, turnos: turnos.get(id)!.size }]))
}

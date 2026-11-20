import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import type { Empleado } from './modelos'
import { encolar } from './sincronizacion'

// Todos, también los de baja: el historial necesita sus nombres.
export function useEmpleados() {
  return useLiveQuery(() => db.empleados.orderBy('nombre').toArray(), [])
}

export async function guardarEmpleado(empleado: Empleado) {
  await db.empleados.put(empleado)
  const { id, ...cuerpo } = empleado
  await encolar('PUT', `/empleados/${id}`, cuerpo, 'empleados')
}

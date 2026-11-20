import { describe, expect, it } from 'vitest'
import type { Presencia } from './modelos'
import { horasPorEmpleado, minutosEnTurno } from './turnos'

function presencia(empleado_id: string, caja_id: string, entrada: string, salida: string | null): Presencia {
  return { id: `${empleado_id}-${entrada}`, caja_id, empleado_id, entrada, salida }
}

const ahora = new Date('2026-11-20T16:00:00Z')

describe('minutosEnTurno', () => {
  it('sin salida cuenta hasta ahora', () => {
    expect(minutosEnTurno(presencia('juan', 'c1', '2026-11-20T11:00:00Z', null), ahora)).toBe(300)
  })
})

describe('horasPorEmpleado', () => {
  it('suma las presencias de cada uno y cuenta los turnos distintos', () => {
    const horas = horasPorEmpleado(
      [
        presencia('juan', 'c1', '2026-11-19T10:30:00Z', '2026-11-19T17:30:00Z'),
        // Se fue y volvió en el mismo turno: suma minutos pero es un solo turno.
        presencia('ana', 'c1', '2026-11-19T10:30:00Z', '2026-11-19T12:00:00Z'),
        presencia('ana', 'c1', '2026-11-19T14:00:00Z', '2026-11-19T17:30:00Z'),
        presencia('juan', 'c2', '2026-11-20T11:00:00Z', null),
      ],
      ahora,
    )
    expect(horas.get('juan')).toEqual({ minutos: 420 + 300, turnos: 2 })
    expect(horas.get('ana')).toEqual({ minutos: 90 + 210, turnos: 1 })
  })
})

import { describe, expect, it } from 'vitest'
import { formatearDia, formatearDuracion, formatearHora, periodos } from './fechas'

describe('formatearHora', () => {
  it('muestra la hora de Argentina sin importar la zona del dispositivo', () => {
    expect(formatearHora('2026-11-20T11:00:00Z')).toBe('08:00')
    expect(formatearHora('2026-11-21T02:30:00Z')).toBe('23:30')
  })
})

describe('formatearDia', () => {
  it('usa el día de Argentina, sin comas', () => {
    expect(formatearDia('2026-11-20T11:00:00Z')).toBe('vie 20 nov')
    // 01:30 UTC del sábado todavía es viernes en Argentina.
    expect(formatearDia('2026-11-21T01:30:00Z')).toBe('vie 20 nov')
  })
})

describe('formatearDuracion', () => {
  it('separa horas y minutos y omite lo que da cero', () => {
    expect(formatearDuracion(390)).toBe('6 h 30 min')
    expect(formatearDuracion(240)).toBe('4 h')
    expect(formatearDuracion(45)).toBe('45 min')
    expect(formatearDuracion(0)).toBe('0 min')
  })
})

describe('periodos', () => {
  // Domingo 1 de noviembre de 2026, 23:30 en Argentina: en UTC ya es lunes 2.
  const ahora = new Date('2026-11-02T02:30:00Z')
  const [semana, mes, anterior] = periodos(ahora)

  it('la semana arranca el lunes a la medianoche de Argentina', () => {
    expect(semana.desde.toISOString()).toBe('2026-10-26T03:00:00.000Z')
    expect(semana.hasta.toISOString()).toBe('2026-11-02T03:00:00.000Z')
  })

  it('los meses van de medianoche a medianoche en Argentina', () => {
    expect([mes.nombre, mes.desde.toISOString(), mes.hasta.toISOString()]).toEqual(['Noviembre', '2026-11-01T03:00:00.000Z', '2026-12-01T03:00:00.000Z'])
    expect([anterior.nombre, anterior.desde.toISOString()]).toEqual(['Octubre', '2026-10-01T03:00:00.000Z'])
  })
})

import { describe, expect, it } from 'vitest'
import type { Caja, MovimientoCaja, Venta } from './modelos'
import { calcularResumen } from './resumenCaja'

const caja: Caja = { id: 'c1', abierta_en: '', cerrada_en: null, monto_inicial: 1000000, monto_contado: null, nota: null }

function venta(total: number, pagos: [Venta['pagos'][number]['medio'], number][], anulada = false, cajaId = 'c1'): Venta {
  return {
    id: crypto.randomUUID(),
    caja_id: cajaId,
    total,
    anulada,
    creado_en: '',
    items: [],
    pagos: pagos.map(([medio, monto]) => ({ id: '', medio, monto, recibido: null })),
  }
}

function movimiento(tipo: MovimientoCaja['tipo'], monto: number): MovimientoCaja {
  return { id: crypto.randomUUID(), caja_id: 'c1', tipo, monto, motivo: '', creado_en: '' }
}

describe('calcularResumen', () => {
  it('caja sin movimientos espera solo el inicial', () => {
    const resumen = calcularResumen(caja, [], [])
    expect(resumen.efectivo_esperado).toBe(1000000)
    expect(resumen.cantidad_ventas).toBe(0)
  })

  it('suma por medio, ignora anuladas y otras cajas', () => {
    const ventas = [
      venta(100000, [['efectivo', 100000]]),
      venta(50000, [['debito', 50000]]),
      venta(100000, [['efectivo', 30000], ['qr', 70000]]),
      venta(999999, [['efectivo', 999999]], true),
      venta(888888, [['efectivo', 888888]], false, 'otra'),
    ]
    const resumen = calcularResumen(caja, ventas, [movimiento('egreso', 200000), movimiento('ingreso', 50000)])

    expect(resumen.cantidad_ventas).toBe(3)
    expect(resumen.total_ventas).toBe(250000)
    expect(resumen.por_medio).toEqual({ efectivo: 130000, debito: 50000, credito: 0, transferencia: 0, qr: 70000 })
    expect(resumen.efectivo_esperado).toBe(1000000 + 130000 + 50000 - 200000)
  })
})

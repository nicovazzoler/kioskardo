import type { Caja, MedioPago, MovimientoCaja, ResumenCaja, Venta } from './modelos'

// Misma cuenta que backend/app/resumen.py, pero con los datos locales: así funciona sin conexión.
// Si cambia una, hay que cambiar la otra.
export function calcularResumen(caja: Caja, ventas: Venta[], movimientos: MovimientoCaja[]): ResumenCaja {
  const validas = ventas.filter((v) => v.caja_id === caja.id && !v.anulada)
  const porMedio: Record<MedioPago, number> = { efectivo: 0, debito: 0, credito: 0, transferencia: 0, qr: 0 }
  for (const venta of validas) {
    for (const pago of venta.pagos) porMedio[pago.medio] += pago.monto
  }

  const sumar = (tipo: MovimientoCaja['tipo']) =>
    movimientos.filter((m) => m.caja_id === caja.id && m.tipo === tipo).reduce((suma, m) => suma + m.monto, 0)
  const ingresos = sumar('ingreso')
  const egresos = sumar('egreso')

  return {
    cantidad_ventas: validas.length,
    total_ventas: validas.reduce((suma, v) => suma + v.total, 0),
    por_medio: porMedio,
    ingresos,
    egresos,
    efectivo_esperado: caja.monto_inicial + porMedio.efectivo + ingresos - egresos,
  }
}

import type { MedioPago } from './modelos'

export const MEDIOS_PAGO: { valor: MedioPago; nombre: string; icono: string }[] = [
  { valor: 'efectivo', nombre: 'Efectivo', icono: '💵' },
  { valor: 'debito', nombre: 'Débito', icono: '💳' },
  { valor: 'credito', nombre: 'Crédito', icono: '💳' },
  { valor: 'transferencia', nombre: 'Transferencia', icono: '🏦' },
  { valor: 'qr', nombre: 'QR', icono: '📱' },
]

export function nombreMedio(medio: MedioPago): string {
  return MEDIOS_PAGO.find((m) => m.valor === medio)!.nombre
}

// Billetes argentinos en centavos, para los botones de "paga con".
const BILLETES = [100000, 200000, 1000000, 2000000]

// Sugerencias de "paga con": para cada billete, el primer múltiplo que cubre el total.
// Para $3.700 sugiere $4.000, $10.000 y $20.000.
export function sugerenciasDePago(total: number): number[] {
  const opciones = BILLETES.map((billete) => Math.ceil(total / billete) * billete).filter((monto) => monto > total)
  return [...new Set(opciones)].sort((a, b) => a - b).slice(0, 3)
}

import type { MedioPago } from './modelos'

export const MEDIOS_PAGO: { valor: MedioPago; nombre: string; corto: string; color: string }[] = [
  { valor: 'efectivo', nombre: 'Efectivo', corto: 'Efectivo', color: 'bg-salvia' },
  { valor: 'debito', nombre: 'Débito', corto: 'Débito', color: 'bg-celeste' },
  { valor: 'credito', nombre: 'Crédito', corto: 'Crédito', color: 'bg-rosa' },
  { valor: 'transferencia', nombre: 'Transferencia', corto: 'Transf.', color: 'bg-lavanda' },
  { valor: 'qr', nombre: 'QR', corto: 'QR', color: 'bg-manteca' },
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

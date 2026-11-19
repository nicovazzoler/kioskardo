import { formatearPesosCorto } from '../../lib/dinero'

// Contado menos esperado: 0 cuadra, positivo sobra plata, negativo falta.
export function Diferencia({ monto, grande = false }: { monto: number; grande?: boolean }) {
  const [texto, color] =
    monto === 0
      ? ['Cuadra ✓', 'text-ok']
      : monto > 0
        ? [`Sobran ${formatearPesosCorto(monto)}`, 'text-ambar']
        : [`Faltan ${formatearPesosCorto(-monto)}`, 'text-error']
  return <span className={`font-semibold tabular-nums ${color} ${grande ? 'font-display text-3xl' : ''}`}>{texto}</span>
}

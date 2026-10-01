import { formatearPesos } from '../../lib/dinero'

// Contado menos esperado: 0 cuadra, positivo sobra plata, negativo falta.
export function Diferencia({ monto, grande = false }: { monto: number; grande?: boolean }) {
  const [texto, color] =
    monto === 0
      ? ['Cuadra ✓', 'text-emerald-700']
      : monto > 0
        ? [`Sobran ${formatearPesos(monto)}`, 'text-amber-700']
        : [`Faltan ${formatearPesos(-monto)}`, 'text-red-700']
  return <span className={`font-semibold tabular-nums ${color} ${grande ? 'text-2xl' : ''}`}>{texto}</span>
}

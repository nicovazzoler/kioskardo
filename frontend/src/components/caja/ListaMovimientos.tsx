import { formatearPesos } from '../../lib/dinero'
import { formatearHora } from '../../lib/fechas'
import type { MovimientoCaja } from '../../lib/modelos'

export function ListaMovimientos({ movimientos }: { movimientos: MovimientoCaja[] }) {
  if (movimientos.length === 0) return <p className="py-8 text-center text-apagado">No hubo ingresos ni egresos.</p>

  return (
    <ul>
      {movimientos.map((m) => (
        <li key={m.id} className="flex items-center gap-3 border-b border-linea px-1 py-3">
          <span className="w-12 shrink-0 text-sm text-tenue tabular-nums">{formatearHora(m.creado_en)}</span>
          <span className="min-w-0 flex-1 truncate">{m.motivo}</span>
          <span className={`font-display font-semibold tabular-nums ${m.tipo === 'ingreso' ? 'text-ok' : 'text-error'}`}>
            {m.tipo === 'ingreso' ? '+' : '−'} {formatearPesos(m.monto)}
          </span>
        </li>
      ))}
    </ul>
  )
}

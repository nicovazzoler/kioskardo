import { formatearPesos } from '../../lib/dinero'
import { formatearHora } from '../../lib/fechas'
import type { MovimientoCaja } from '../../lib/modelos'

export function ListaMovimientos({ movimientos }: { movimientos: MovimientoCaja[] }) {
  if (movimientos.length === 0) return <p className="py-8 text-center text-slate-400">No hubo ingresos ni egresos.</p>

  return (
    <ul className="divide-y divide-slate-100 rounded-xl bg-white ring-1 ring-slate-200">
      {movimientos.map((m) => (
        <li key={m.id} className="flex items-center gap-3 px-4 py-3">
          <span className="w-12 shrink-0 text-sm text-slate-500 tabular-nums">{formatearHora(m.creado_en)}</span>
          <span className="min-w-0 flex-1 truncate">{m.motivo}</span>
          <span className={`font-semibold tabular-nums ${m.tipo === 'ingreso' ? 'text-emerald-700' : 'text-red-700'}`}>
            {m.tipo === 'ingreso' ? '+' : '−'} {formatearPesos(m.monto)}
          </span>
        </li>
      ))}
    </ul>
  )
}

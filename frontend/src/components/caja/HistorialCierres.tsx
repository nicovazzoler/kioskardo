import { useEffect, useState } from 'react'
import { pedirApi } from '../../lib/api'
import { formatearPesos } from '../../lib/dinero'
import { formatearFechaHora } from '../../lib/fechas'
import type { CajaConResumen } from '../../lib/modelos'
import { Diferencia } from './Diferencia'

// Los cierres viejos no se guardan en el dispositivo: se piden al servidor y requieren conexión.
export function HistorialCierres() {
  const [cierres, setCierres] = useState<CajaConResumen[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    pedirApi<CajaConResumen[]>('/cajas')
      .then(setCierres)
      .catch(() => setError(true))
  }, [])

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">Cierres anteriores</h2>
      {error ? (
        <p className="mt-2 text-slate-500">Se necesita conexión para ver el historial.</p>
      ) : cierres === null ? (
        <p className="mt-2 text-slate-400">Cargando…</p>
      ) : cierres.length === 0 ? (
        <p className="mt-2 text-slate-500">Todavía no se cerró ninguna caja.</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100 rounded-xl bg-white ring-1 ring-slate-200">
          {cierres.map((c) => (
            <li key={c.id} className="grid grid-cols-2 gap-x-4 gap-y-1 px-4 py-3 text-sm md:grid-cols-4 md:items-center">
              <span className="font-medium">{formatearFechaHora(c.cerrada_en!)}</span>
              <span className="text-right tabular-nums md:text-left">
                Ventas: <strong>{formatearPesos(c.resumen.total_ventas)}</strong>
              </span>
              <span className="text-slate-500 tabular-nums">
                Contado {formatearPesos(c.monto_contado!)} de {formatearPesos(c.resumen.efectivo_esperado)}
              </span>
              <span className="text-right">
                <Diferencia monto={c.monto_contado! - c.resumen.efectivo_esperado} />
              </span>
              {c.nota && <span className="col-span-2 text-slate-500 italic md:col-span-4">“{c.nota}”</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

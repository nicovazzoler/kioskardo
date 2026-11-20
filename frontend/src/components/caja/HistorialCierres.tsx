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
      <h2 className="font-display text-2xl font-semibold">Cierres anteriores</h2>
      {error ? (
        <p className="mt-2 text-tenue">Se necesita conexión para ver el historial.</p>
      ) : cierres === null ? (
        <p className="mt-2 text-apagado">Cargando…</p>
      ) : cierres.length === 0 ? (
        <p className="mt-2 text-tenue">Todavía no se cerró ninguna caja.</p>
      ) : (
        <ul className="mt-3 divide-y divide-linea overflow-hidden rounded-2xl border border-linea bg-panel">
          {cierres.map((c) => (
            <li key={c.id} className="grid grid-cols-2 gap-x-4 gap-y-1 px-4 py-3 text-sm md:grid-cols-4 md:items-center">
              <span className="font-medium">{formatearFechaHora(c.cerrada_en!)}</span>
              <span className="text-right tabular-nums md:text-left">
                Ventas: <strong>{formatearPesos(c.resumen.total_ventas)}</strong>
              </span>
              <span className="text-tenue tabular-nums">
                Contado {formatearPesos(c.monto_contado!)} de {formatearPesos(c.resumen.efectivo_esperado)}
              </span>
              <span className="text-right">
                <Diferencia monto={c.monto_contado! - c.resumen.efectivo_esperado} />
              </span>
              {c.nota && <span className="col-span-2 text-tenue italic md:col-span-4">“{c.nota}”</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

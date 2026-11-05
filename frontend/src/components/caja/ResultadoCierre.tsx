import { formatearPesos } from '../../lib/dinero'
import { formatearFechaHora } from '../../lib/fechas'
import type { Caja, ResumenCaja } from '../../lib/modelos'
import { DetalleResumen } from './DetalleResumen'
import { Diferencia } from './Diferencia'

interface Props {
  caja: Caja
  resumen: ResumenCaja
  alTerminar: () => void
}

export function ResultadoCierre({ caja, resumen, alTerminar }: Props) {
  const diferencia = caja.monto_contado! - resumen.efectivo_esperado

  return (
    <section className="mx-auto max-w-4xl p-4 md:p-6">
      <h1 className="text-2xl font-bold">Caja cerrada ✓</h1>
      <p className="mt-1 text-slate-500">
        {formatearFechaHora(caja.abierta_en)} → {formatearFechaHora(caja.cerrada_en!)}
      </p>

      <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2 rounded-xl bg-white p-5 ring-1 ring-slate-200">
        <span className="text-slate-600">
          Contado {formatearPesos(caja.monto_contado!)} de {formatearPesos(resumen.efectivo_esperado)}
        </span>
        <Diferencia monto={diferencia} grande />
        {caja.nota && <p className="w-full text-slate-500 italic">“{caja.nota}”</p>}
      </div>

      <div className="mt-4">
        <DetalleResumen montoInicial={caja.monto_inicial} resumen={resumen} />
      </div>

      <button onClick={alTerminar} className="mt-6 w-full rounded-lg bg-marca-700 py-3 font-semibold text-white md:w-auto md:px-8">
        Listo
      </button>
    </section>
  )
}

import { formatearPesos } from '../../lib/dinero'
import { botonPrimario } from '../../lib/estilos'
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
      <h1 className="font-display text-3xl font-semibold tracking-tight">Caja cerrada</h1>
      <p className="mt-1 text-tenue">
        {formatearFechaHora(caja.abierta_en)} → {formatearFechaHora(caja.cerrada_en!)}
      </p>

      <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2 border-t border-linea py-5">
        <span className="text-tenue">
          Contado {formatearPesos(caja.monto_contado!)} de {formatearPesos(resumen.efectivo_esperado)}
        </span>
        <Diferencia monto={diferencia} grande />
        {caja.nota && <p className="w-full text-tenue italic">“{caja.nota}”</p>}
      </div>

      <div>
        <DetalleResumen montoInicial={caja.monto_inicial} resumen={resumen} />
      </div>

      <button onClick={alTerminar} className={`${botonPrimario} mt-6 w-full py-3 md:w-auto md:px-8`}>
        Listo
      </button>
    </section>
  )
}

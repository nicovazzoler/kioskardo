import { formatearPesosCorto } from '../../lib/dinero'
import { MEDIOS_PAGO } from '../../lib/mediosPago'
import type { ResumenCaja } from '../../lib/modelos'

interface Props {
  montoInicial: number
  resumen: ResumenCaja
}

// Las dos columnas de la caja: cuánto efectivo debería haber y cuánto se vendió por cada medio.
export function DetalleResumen({ montoInicial, resumen }: Props) {
  // Redondeado a pesos enteros: los centavos del promedio no le dicen nada a nadie.
  const promedio = resumen.cantidad_ventas ? Math.round(resumen.total_ventas / resumen.cantidad_ventas / 100) * 100 : 0

  return (
    <div className="grid border-y border-linea md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <section className="flex flex-col gap-2 py-5 md:pr-8">
        <p className="text-sm text-tinta-suave">Efectivo que debería haber en el cajón</p>
        <p className="font-display text-5xl leading-none font-semibold tracking-tight text-manteca tabular-nums">{formatearPesosCorto(resumen.efectivo_esperado)}</p>
        <dl className="mt-2 space-y-1 text-sm">
          <Linea nombre="Inicial" monto={montoInicial} />
          <Linea nombre="+ Ventas en efectivo" monto={resumen.por_medio.efectivo} />
          <Linea nombre="+ Ingresos" monto={resumen.ingresos} />
          <Linea nombre="− Egresos" monto={resumen.egresos} />
        </dl>
      </section>

      <section className="flex flex-col gap-2 border-t border-linea py-5 md:border-t-0 md:border-l md:pl-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm text-tinta-suave">Ventas</p>
          <p className="text-sm text-tenue">
            {resumen.cantidad_ventas} {resumen.cantidad_ventas === 1 ? 'venta' : 'ventas'}
            {resumen.cantidad_ventas > 0 && ` · ticket promedio ${formatearPesosCorto(promedio)}`}
          </p>
        </div>
        <p className="font-display text-5xl leading-none font-semibold tracking-tight tabular-nums">{formatearPesosCorto(resumen.total_ventas)}</p>
        {resumen.total_ventas > 0 && (
          <div aria-hidden="true" className="mt-2 flex h-2 gap-0.5">
            {MEDIOS_PAGO.filter((m) => resumen.por_medio[m.valor] > 0).map((m) => (
              <span key={m.valor} className={`rounded-[1px] ${m.color}`} style={{ width: `${(resumen.por_medio[m.valor] / resumen.total_ventas) * 100}%` }} />
            ))}
          </div>
        )}
        <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-3">
          {MEDIOS_PAGO.map((m) => (
            <div key={m.valor} className={`flex items-center gap-2 ${resumen.por_medio[m.valor] === 0 ? 'text-apagado' : ''}`}>
              <span className={`h-2.5 w-2.5 shrink-0 rounded-[2px] ${m.color}`} />
              <dt className="text-tinta-suave">{m.corto}</dt>
              <dd className="ml-auto font-display font-semibold tabular-nums">{formatearPesosCorto(resumen.por_medio[m.valor])}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}

function Linea({ nombre, monto }: { nombre: string; monto: number }) {
  return (
    <div className="flex justify-between">
      <dt className="text-tenue">{nombre}</dt>
      <dd className="font-display tabular-nums">{formatearPesosCorto(monto)}</dd>
    </div>
  )
}

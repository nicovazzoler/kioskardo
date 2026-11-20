import { formatearPesosCorto } from '../../lib/dinero'
import { MEDIOS_PAGO } from '../../lib/mediosPago'
import type { ResumenCaja } from '../../lib/modelos'

interface Props {
  montoInicial: number
  resumen: ResumenCaja
}

// Las dos tarjetas de la caja: cuánto efectivo debería haber y cuánto se vendió por cada medio.
export function DetalleResumen({ montoInicial, resumen }: Props) {
  // Redondeado a pesos enteros: los centavos del promedio no le dicen nada a nadie.
  const promedio = resumen.cantidad_ventas ? Math.round(resumen.total_ventas / resumen.cantidad_ventas / 100) * 100 : 0

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
      <section className="flex flex-col gap-3 rounded-3xl bg-manteca p-5 text-fondo">
        <p className="font-semibold">Efectivo que debería haber en el cajón</p>
        <p className="font-display text-5xl leading-none font-semibold tabular-nums">{formatearPesosCorto(resumen.efectivo_esperado)}</p>
        <dl className="space-y-1 border-t-[1.5px] border-dashed border-fondo/25 pt-3 text-sm">
          <Linea nombre="Inicial" monto={montoInicial} />
          <Linea nombre="+ Ventas en efectivo" monto={resumen.por_medio.efectivo} />
          <Linea nombre="+ Ingresos" monto={resumen.ingresos} />
          <Linea nombre="− Egresos" monto={resumen.egresos} />
        </dl>
      </section>

      <section className="flex flex-col gap-3 rounded-3xl border border-linea bg-tarjeta p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-semibold">Ventas</p>
          <p className="text-sm text-tenue">
            {resumen.cantidad_ventas} {resumen.cantidad_ventas === 1 ? 'venta' : 'ventas'}
            {resumen.cantidad_ventas > 0 && ` · ticket promedio ${formatearPesosCorto(promedio)}`}
          </p>
        </div>
        <p className="font-display text-5xl leading-none font-semibold tabular-nums">{formatearPesosCorto(resumen.total_ventas)}</p>
        {resumen.total_ventas > 0 && (
          <div aria-hidden="true" className="flex h-3 gap-0.5 overflow-hidden rounded-full">
            {MEDIOS_PAGO.filter((m) => resumen.por_medio[m.valor] > 0).map((m) => (
              <span key={m.valor} className={m.color} style={{ width: `${(resumen.por_medio[m.valor] / resumen.total_ventas) * 100}%` }} />
            ))}
          </div>
        )}
        <dl className="grid grid-cols-2 gap-x-5 gap-y-1.5 text-sm sm:grid-cols-3">
          {MEDIOS_PAGO.map((m) => (
            <div key={m.valor} className={`flex items-center gap-2 ${resumen.por_medio[m.valor] === 0 ? 'text-apagado' : ''}`}>
              <span className={`h-2.5 w-2.5 shrink-0 rounded-[3px] ${m.color}`} />
              <dt>{m.corto}</dt>
              <dd className="ml-auto font-semibold tabular-nums">{formatearPesosCorto(resumen.por_medio[m.valor])}</dd>
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
      <dt>{nombre}</dt>
      <dd className="tabular-nums">{formatearPesosCorto(monto)}</dd>
    </div>
  )
}

import { formatearPesos } from '../../lib/dinero'
import { MEDIOS_PAGO } from '../../lib/mediosPago'
import type { ResumenCaja } from '../../lib/modelos'

interface Props {
  montoInicial: number
  resumen: ResumenCaja
}

// Las dos tarjetas de la caja: cuánto efectivo debería haber y cuánto se vendió por cada medio.
export function DetalleResumen({ montoInicial, resumen }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
        <p className="text-sm text-slate-500">Efectivo que debería haber</p>
        <p className="text-4xl font-bold tabular-nums">{formatearPesos(resumen.efectivo_esperado)}</p>
        <dl className="mt-4 space-y-1 text-sm">
          <Linea nombre="Inicial" monto={montoInicial} />
          <Linea nombre="+ Ventas en efectivo" monto={resumen.por_medio.efectivo} />
          <Linea nombre="+ Ingresos" monto={resumen.ingresos} />
          <Linea nombre="− Egresos" monto={resumen.egresos} />
        </dl>
      </section>

      <section className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
        <p className="text-sm text-slate-500">
          Ventas · {resumen.cantidad_ventas} {resumen.cantidad_ventas === 1 ? 'venta' : 'ventas'}
        </p>
        <p className="text-4xl font-bold tabular-nums">{formatearPesos(resumen.total_ventas)}</p>
        <dl className="mt-4 space-y-1 text-sm">
          {MEDIOS_PAGO.map((m) => (
            <Linea key={m.valor} nombre={`${m.icono} ${m.nombre}`} monto={resumen.por_medio[m.valor]} />
          ))}
        </dl>
      </section>
    </div>
  )
}

function Linea({ nombre, monto }: { nombre: string; monto: number }) {
  return (
    <div className={`flex justify-between ${monto === 0 ? 'text-slate-400' : 'text-slate-700'}`}>
      <dt>{nombre}</dt>
      <dd className="tabular-nums">{formatearPesos(monto)}</dd>
    </div>
  )
}

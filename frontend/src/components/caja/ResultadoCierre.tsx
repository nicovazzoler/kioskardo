import { useEmpleados } from '../../lib/empleados'
import { formatearPesosCorto } from '../../lib/dinero'
import { rotulo } from '../../lib/estilos'
import { formatearDia, formatearDuracion, formatearHora, minutosEntre } from '../../lib/fechas'
import type { Caja, Presencia, ResumenCaja } from '../../lib/modelos'
import { minutosEnTurno } from '../../lib/turnos'
import { AbrirCaja } from '../venta/AbrirCaja'
import { Diferencia } from './Diferencia'

interface Props {
  caja: Caja
  resumen: ResumenCaja
  presencias: Presencia[]
  alTerminar: () => void
}

// El arqueo y las horas del turno que se cerró, y al lado la opción de abrir el siguiente.
export function ResultadoCierre({ caja, resumen, presencias, alTerminar }: Props) {
  const empleados = useEmpleados()
  const cerrada = new Date(caja.cerrada_en!)
  const nombre = (id: string) => empleados?.find((e) => e.id === id)?.nombre ?? '—'

  return (
    <section className="mx-auto grid max-w-5xl gap-10 p-4 md:p-6 lg:grid-cols-2">
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Turno cerrado</h1>
          <p className="mt-1 text-tenue">
            {formatearDia(caja.abierta_en)} · {formatearHora(caja.abierta_en)} → {formatearHora(caja.cerrada_en!)} · {formatearDuracion(minutosEntre(caja.abierta_en, cerrada))}
          </p>
        </div>

        <div className="space-y-1 border-y border-linea py-4">
          <p className="text-tinta-suave">
            Contado {formatearPesosCorto(caja.monto_contado!)} de {formatearPesosCorto(resumen.efectivo_esperado)}
          </p>
          <Diferencia monto={caja.monto_contado! - resumen.efectivo_esperado} grande />
          {caja.nota && <p className="text-tenue italic">“{caja.nota}”</p>}
        </div>

        {presencias.length > 0 && (
          <div>
            <p className={`${rotulo} pb-1.5 text-apagado`}>Horas del turno</p>
            <ul className="border-t border-linea">
              {presencias.map((presencia) => (
                <li key={presencia.id} className="grid min-h-11 grid-cols-[minmax(0,1fr)_auto_88px] items-center gap-3 border-b border-linea text-sm">
                  <span className="font-semibold">{nombre(presencia.empleado_id)}</span>
                  <span className="text-tenue">
                    {formatearHora(presencia.entrada)} → {formatearHora(presencia.salida ?? caja.cerrada_en!)}
                  </span>
                  <span className="text-right font-display font-semibold">{formatearDuracion(minutosEnTurno(presencia, cerrada))}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-sm text-tenue">
          Ventas del turno {formatearPesosCorto(resumen.total_ventas)} · {resumen.cantidad_ventas} {resumen.cantidad_ventas === 1 ? 'venta' : 'ventas'}. El historial queda en Admin.
        </p>
      </div>

      <div className="space-y-4 border-t border-linea pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight">¿Sigue otro turno?</h2>
          <p className="mt-1 text-sm text-tenue">Se abre ya, con la plata que se acaba de contar.</p>
        </div>
        <AbrirCaja integrado montoSugerido={caja.monto_contado} alAbrir={alTerminar} />
        <button onClick={alTerminar} className="text-sm text-tenue underline underline-offset-4 hover:text-tinta">
          No, terminar el día
        </button>
      </div>
    </section>
  )
}

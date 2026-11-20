import { useState } from 'react'
import { useEmpleados } from '../../lib/empleados'
import { rotulo } from '../../lib/estilos'
import { formatearHora } from '../../lib/fechas'
import { marcarSalida, sumarAlTurno, usePresencias } from '../../lib/turnos'

// Quiénes están en el turno abierto. "Se va" y "Sumar a alguien" anotan la hora en ese momento.
export function EnElTurno({ cajaId }: { cajaId: string }) {
  const presencias = usePresencias(cajaId)
  const empleados = useEmpleados()
  const [sumando, setSumando] = useState(false)

  if (!presencias || !empleados || empleados.length === 0) return null
  const nombre = (id: string) => empleados.find((e) => e.id === id)?.nombre ?? '—'
  const presentes = new Set(presencias.filter((p) => p.salida === null).map((p) => p.empleado_id))
  const paraSumar = empleados.filter((e) => e.activo && !presentes.has(e.id))

  return (
    <section aria-label="En el turno" className="mt-5">
      <p className={`${rotulo} text-apagado`}>En el turno</p>
      {presencias.length === 0 ? (
        <p className="py-2 text-sm text-tenue">No se anotó a nadie.</p>
      ) : (
        <ul className="mt-1 grid border-t border-linea sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-3">
          {presencias.map((presencia) => (
            <li key={presencia.id} className={`flex min-h-13 items-center gap-3 border-b border-linea ${presencia.salida ? 'text-apagado' : ''}`}>
              <span className="flex-1">
                <span className="block font-semibold">{nombre(presencia.empleado_id)}</span>
                <span className="block text-xs text-tenue">
                  {presencia.salida ? `${formatearHora(presencia.entrada)} → ${formatearHora(presencia.salida)}` : `desde ${formatearHora(presencia.entrada)}`}
                </span>
              </span>
              {!presencia.salida && (
                <button
                  onClick={() => confirm(`¿${nombre(presencia.empleado_id)} se va del turno? Se anota su salida ahora.`) && void marcarSalida(presencia)}
                  className="h-10 text-sm text-tenue underline underline-offset-4 hover:text-tinta"
                >
                  Se va
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {paraSumar.length > 0 &&
        (sumando ? (
          <div className="mt-1 flex flex-wrap items-center gap-x-5">
            <span className="text-sm text-tenue">¿Quién entra?</span>
            {paraSumar.map((empleado) => (
              <button
                key={empleado.id}
                onClick={() => {
                  void sumarAlTurno(cajaId, empleado.id)
                  setSumando(false)
                }}
                className="h-10 font-semibold text-ambar hover:text-tinta"
              >
                {empleado.nombre}
              </button>
            ))}
            <button onClick={() => setSumando(false)} className="h-10 text-sm text-tenue underline underline-offset-4">
              Cancelar
            </button>
          </div>
        ) : (
          <button onClick={() => setSumando(true)} className="mt-1 h-10 text-sm font-semibold text-ambar hover:text-tinta">
            + Sumar a alguien al turno
          </button>
        ))}
    </section>
  )
}

import { useEffect, useState } from 'react'
import { useAhora } from '../../hooks/useAhora'
import { pedirApi } from '../../lib/api'
import { formatearPesosCorto } from '../../lib/dinero'
import { useEmpleados } from '../../lib/empleados'
import { claseOpcion, rotulo } from '../../lib/estilos'
import { formatearDia, formatearDuracion, formatearHora, minutosEntre, periodos, type Periodo } from '../../lib/fechas'
import type { CajaConResumen } from '../../lib/modelos'
import { horasPorEmpleado } from '../../lib/turnos'
import { Diferencia } from '../caja/Diferencia'

type Resultado = { clave: Periodo['clave'] } & ({ cajas: CajaConResumen[] } | { error: true })

// Los turnos viejos no se guardan en el dispositivo: se piden al servidor y requieren conexión.
export function TurnosYHoras() {
  const [opciones] = useState(() => periodos())
  const [periodo, setPeriodo] = useState(opciones[0])
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const empleados = useEmpleados()
  const ahora = useAhora()

  useEffect(() => {
    let vigente = true
    const consulta = new URLSearchParams({ desde: periodo.desde.toISOString(), hasta: periodo.hasta.toISOString(), limite: '500' })
    pedirApi<CajaConResumen[]>(`/cajas?${consulta}`)
      .then((cajas) => vigente && setResultado({ clave: periodo.clave, cajas }))
      .catch(() => vigente && setResultado({ clave: periodo.clave, error: true }))
    return () => {
      vigente = false
    }
  }, [periodo])

  const nombre = (id: string) => empleados?.find((e) => e.id === id)?.nombre ?? '—'
  const actual = resultado?.clave === periodo.clave ? resultado : null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Turnos y horas</h1>
        <div aria-label="Período" className="flex gap-5 border-b border-linea">
          {opciones.map((opcion) => (
            <button key={opcion.clave} onClick={() => setPeriodo(opcion)} aria-pressed={opcion.clave === periodo.clave} className={`h-10 text-sm ${claseOpcion(opcion.clave === periodo.clave)}`}>
              {opcion.nombre}
            </button>
          ))}
        </div>
      </div>

      {actual === null ? (
        <p className="text-apagado">Cargando…</p>
      ) : 'error' in actual ? (
        <p className="text-tenue">Se necesita conexión para ver el historial de turnos.</p>
      ) : actual.cajas.length === 0 ? (
        <p className="text-tenue">No hubo turnos en este período.</p>
      ) : (
        <>
          <HorasPorEmpleado cajas={actual.cajas} ahora={ahora} nombre={nombre} />
          <ListaTurnos cajas={actual.cajas} ahora={ahora} nombre={nombre} />
          <p className="text-xs text-tenue">Horas en hora de Argentina. Cada empleado suma desde que entra al turno hasta que se va o se cierra.</p>
        </>
      )}
    </div>
  )
}

interface PropsTabla {
  cajas: CajaConResumen[]
  ahora: Date
  nombre: (empleadoId: string) => string
}

function HorasPorEmpleado({ cajas, ahora, nombre }: PropsTabla) {
  const horas = [...horasPorEmpleado(cajas.flatMap((c) => c.presencias), ahora)].sort((a, b) => b[1].minutos - a[1].minutos)
  if (horas.length === 0) return <p className="text-sm text-tenue">En este período no se anotó a nadie en los turnos.</p>

  return (
    <table className="w-full max-w-md text-sm">
      <caption className="sr-only">Horas por empleado</caption>
      <thead>
        <tr className={`${rotulo} text-apagado`}>
          <th className="pb-1.5 text-left font-bold">Empleado</th>
          <th className="pb-1.5 text-right font-bold">Turnos</th>
          <th className="pb-1.5 text-right font-bold">Horas</th>
        </tr>
      </thead>
      <tbody>
        {horas.map(([empleadoId, { minutos, turnos }]) => (
          <tr key={empleadoId} className="h-11 border-t border-linea">
            <td className="font-semibold">{nombre(empleadoId)}</td>
            <td className="text-right text-tenue tabular-nums">{turnos}</td>
            <td className="text-right font-display font-semibold">{formatearDuracion(minutos)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ListaTurnos({ cajas, ahora, nombre }: PropsTabla) {
  return (
    <div>
      <p className={`${rotulo} pb-1.5 text-apagado`}>Turnos</p>
      <ul className="border-t border-linea">
        {cajas.map((caja) => {
          const minutos = minutosEntre(caja.abierta_en, caja.cerrada_en ? new Date(caja.cerrada_en) : ahora)
          const quienes = [...new Set(caja.presencias.map((p) => nombre(p.empleado_id)))]
          return (
            <li key={caja.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-0.5 border-b border-linea py-2.5 text-sm md:grid-cols-[88px_120px_80px_minmax(0,1fr)_96px_120px] md:items-center">
              <span className="font-semibold">{formatearDia(caja.abierta_en)}</span>
              <span className="text-right text-tenue md:text-left">
                {formatearHora(caja.abierta_en)} → {caja.cerrada_en ? formatearHora(caja.cerrada_en) : <span className="font-semibold text-ambar">abierto</span>}
              </span>
              <span className="text-tenue md:font-display md:font-semibold md:text-tinta">{formatearDuracion(minutos)}</span>
              <span className="truncate text-right text-tinta-suave md:text-left">{quienes.join(', ') || '—'}</span>
              <span className="tabular-nums md:text-right">{formatearPesosCorto(caja.resumen.total_ventas)}</span>
              <span className="text-right">{caja.monto_contado === null ? '—' : <Diferencia monto={caja.monto_contado - caja.resumen.efectivo_esperado} />}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

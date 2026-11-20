import { useAhora } from '../../hooks/useAhora'
import { useCajaAbierta } from '../../lib/cajas'
import { useEmpleados } from '../../lib/empleados'
import { rotulo } from '../../lib/estilos'
import { formatearDuracion, formatearHora, minutosEntre } from '../../lib/fechas'
import { unirConY } from '../../lib/texto'
import { usePresencias } from '../../lib/turnos'

// Para la barra lateral: quiénes están ahora y desde cuándo está abierto el turno.
export function IndicadorTurno() {
  const caja = useCajaAbierta()
  const presencias = usePresencias(caja?.id)
  const empleados = useEmpleados()
  const ahora = useAhora()

  if (caja === undefined) return null
  const presentes = (presencias ?? []).filter((p) => p.salida === null).map((p) => empleados?.find((e) => e.id === p.empleado_id)?.nombre ?? '—')

  return (
    <div className="flex flex-col gap-0.5 border-t border-linea pt-3 pb-1">
      <span className={`${rotulo} text-apagado`}>Turno</span>
      {caja ? (
        <>
          {presentes.length > 0 && <span className="text-sm text-tinta">{unirConY(presentes)}</span>}
          <span className="text-xs text-tenue">
            desde {formatearHora(caja.abierta_en)} · {formatearDuracion(minutosEntre(caja.abierta_en, ahora))}
          </span>
        </>
      ) : (
        <span className="text-sm text-tenue">Sin turno abierto</span>
      )}
    </div>
  )
}

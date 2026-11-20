import { useState, type FormEvent } from 'react'
import { useCajaAbierta } from '../../lib/cajas'
import { guardarEmpleado, useEmpleados } from '../../lib/empleados'
import { botonPrimario, claseInput } from '../../lib/estilos'
import { normalizar } from '../../lib/texto'
import { usePresencias } from '../../lib/turnos'
import { nuevoId } from '../../lib/uuid'

export function ListaEmpleados() {
  const empleados = useEmpleados()
  const caja = useCajaAbierta()
  const presencias = usePresencias(caja?.id)
  const [nombre, setNombre] = useState('')
  const [error, setError] = useState<string | null>(null)
  const presentes = new Set((presencias ?? []).filter((p) => p.salida === null).map((p) => p.empleado_id))

  const agregar = async (evento: FormEvent) => {
    evento.preventDefault()
    const limpio = nombre.trim().replace(/\s+/g, ' ')
    if (!limpio) return
    if (empleados?.some((e) => normalizar(e.nombre) === normalizar(limpio))) return setError('Ya hay un empleado con ese nombre')
    await guardarEmpleado({ id: nuevoId(), nombre: limpio, activo: true })
    setNombre('')
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Empleados</h1>
        <p className="mt-1 text-sm text-tenue">No tienen usuario ni clave: se los marca al abrir el turno.</p>
      </div>

      <form onSubmit={agregar}>
        <div className="flex gap-2">
          <input
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value)
              setError(null)
            }}
            maxLength={80}
            aria-label="Nombre del empleado"
            placeholder="Nombre del empleado nuevo"
            className={claseInput(error !== null)}
          />
          <button type="submit" disabled={!nombre.trim()} className={`${botonPrimario} shrink-0 px-5`}>
            Agregar
          </button>
        </div>
        {error && <p className="mt-1 text-sm text-error">{error}</p>}
      </form>

      {empleados && empleados.length === 0 ? (
        <p className="text-tenue">Todavía no hay empleados cargados.</p>
      ) : (
        <ul className="border-t border-linea">
          {empleados?.map((empleado) => (
            <li key={empleado.id} className={`flex min-h-14 items-center gap-3 border-b border-linea ${empleado.activo ? '' : 'text-apagado'}`}>
              <span className="flex-1">
                <span className="block font-semibold">{empleado.nombre}</span>
                {!empleado.activo ? (
                  <span className="block text-xs">De baja · sus horas siguen en el historial</span>
                ) : (
                  presentes.has(empleado.id) && <span className="block text-xs text-tenue">En el turno ahora</span>
                )}
              </span>
              {empleado.activo ? (
                <button
                  onClick={() => confirm(`¿Dar de baja a ${empleado.nombre}? Ya no aparece para elegir al abrir un turno.`) && void guardarEmpleado({ ...empleado, activo: false })}
                  className="h-11 text-sm text-tenue underline underline-offset-4 hover:text-tinta"
                >
                  Dar de baja
                </button>
              ) : (
                <button onClick={() => void guardarEmpleado({ ...empleado, activo: true })} className="h-11 text-sm font-semibold text-ambar hover:text-tinta">
                  Reactivar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

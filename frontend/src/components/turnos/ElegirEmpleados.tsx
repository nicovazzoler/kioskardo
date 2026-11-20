import type { Empleado } from '../../lib/modelos'
import { IconoTilde } from '../Iconos'

interface Props {
  empleados: Empleado[]
  elegidos: string[]
  alCambiar: (elegidos: string[]) => void
}

export function ElegirEmpleados({ empleados, elegidos, alCambiar }: Props) {
  const alternar = (id: string) => alCambiar(elegidos.includes(id) ? elegidos.filter((e) => e !== id) : [...elegidos, id])

  return (
    <ul className="border-t border-linea">
      {empleados.map((empleado) => {
        const elegido = elegidos.includes(empleado.id)
        return (
          <li key={empleado.id} className="border-b border-linea">
            <button
              type="button"
              onClick={() => alternar(empleado.id)}
              aria-pressed={elegido}
              className={`flex h-12 w-full items-center text-left ${elegido ? 'font-bold text-tinta' : 'text-tinta-suave hover:text-tinta'}`}
            >
              <span className="flex-1">{empleado.nombre}</span>
              {elegido && (
                <span className="text-ambar">
                  <IconoTilde tamano={20} />
                </span>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

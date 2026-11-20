import { useState, type FormEvent } from 'react'
import { abrirCaja, leerUltimoContado } from '../../lib/cajas'
import { centavosATexto, parsearPesos } from '../../lib/dinero'
import { useEmpleados } from '../../lib/empleados'
import { botonPrimario } from '../../lib/estilos'
import { unirConY } from '../../lib/texto'
import { Campo, InputPesos } from '../Campos'
import { ElegirEmpleados } from '../turnos/ElegirEmpleados'

interface Props {
  // Sin valor se sugiere lo que se contó al cerrar el último turno en este dispositivo.
  montoSugerido?: number | null
  alAbrir?: () => void
  // Al lado del resultado del cierre: sin título ni márgenes propios.
  integrado?: boolean
}

// Para vender tiene que haber un turno (una caja) abierto: cada venta queda asociada a él.
export function AbrirCaja({ montoSugerido, alAbrir, integrado = false }: Props) {
  const empleados = useEmpleados()
  const [sugerido] = useState(() => montoSugerido ?? leerUltimoContado())
  const [texto, setTexto] = useState(() => (sugerido ? centavosATexto(sugerido) : ''))
  const [elegidos, setElegidos] = useState<string[]>([])
  const activos = (empleados ?? []).filter((e) => e.activo)
  const monto = texto.trim() ? parsearPesos(texto) : 0
  const nombres = activos.filter((e) => elegidos.includes(e.id)).map((e) => e.nombre)

  const abrir = async (evento: FormEvent) => {
    evento.preventDefault()
    if (monto === null) return
    await abrirCaja(monto, elegidos)
    alAbrir?.()
  }

  return (
    <form onSubmit={abrir} className={integrado ? 'space-y-5' : 'mx-4 mt-10 max-w-md space-y-5 sm:mx-auto'}>
      {!integrado && (
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Abrir turno</h1>
          <p className="mt-1 text-sm text-tenue">Contá el efectivo del cajón y marcá quiénes trabajan.</p>
        </div>
      )}
      <Campo
        etiqueta="Efectivo inicial"
        error={monto === null ? 'Monto inválido' : null}
        ayuda={sugerido && !integrado ? 'Sugerido: lo que se contó al cerrar el turno anterior.' : undefined}
      >
        <InputPesos valor={texto} alCambiar={setTexto} error={monto === null} placeholder="0" autoFocus={!integrado} />
      </Campo>
      <Campo etiqueta="¿Quién trabaja?" grupo>
        {activos.length === 0 ? (
          <p className="text-sm text-tenue">Para anotar quién trabaja y sus horas, cargá los empleados en Admin.</p>
        ) : (
          <ElegirEmpleados empleados={activos} elegidos={elegidos} alCambiar={setElegidos} />
        )}
      </Campo>
      <button type="submit" disabled={monto === null} className={`${botonPrimario} w-full py-3`}>
        {nombres.length ? `Abrir turno con ${unirConY(nombres)}` : 'Abrir turno'}
      </button>
    </form>
  )
}

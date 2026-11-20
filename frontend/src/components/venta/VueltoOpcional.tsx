import { useState } from 'react'
import { formatearPesosCorto, parsearPesos } from '../../lib/dinero'
import { sugerenciasDePago } from '../../lib/mediosPago'
import { InputPesos } from '../Campos'

interface Props {
  total: number
  recibido: number | null
  alCambiar: (recibido: number | null) => void
}

// Solo efectivo, y opcional: sin tocar nada se cobra justo. Un billete sugerido o "Otro" muestra el vuelto.
export function VueltoOpcional({ total, recibido, alCambiar }: Props) {
  const [otro, setOtro] = useState(false)
  const [texto, setTexto] = useState('')
  const sugerencias = sugerenciasDePago(total)

  const elegir = (monto: number) => {
    setOtro(false)
    alCambiar(recibido === monto ? null : monto)
  }

  const escribir = (valor: string) => {
    setTexto(valor)
    alCambiar(parsearPesos(valor))
  }

  const limpiar = () => {
    setOtro(false)
    setTexto('')
    alCambiar(null)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs text-tenue">¿Paga con?</span>
        {sugerencias.map((monto) => (
          <button
            key={monto}
            type="button"
            onClick={() => elegir(monto)}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${
              !otro && recibido === monto ? 'bg-manteca text-fondo' : 'border border-borde text-tinta-suave hover:bg-elevado'
            }`}
          >
            {formatearPesosCorto(monto)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => (otro ? limpiar() : setOtro(true))}
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${otro ? 'bg-manteca text-fondo' : 'border border-borde text-tinta-suave hover:bg-elevado'}`}
        >
          Otro
        </button>
      </div>

      {otro && <InputPesos autoFocus valor={texto} alCambiar={escribir} placeholder="¿Con cuánto paga?" aria-label="Con cuánto paga" />}

      {recibido !== null && (
        <div className="flex items-baseline gap-3">
          <span className="text-sm">Vuelto</span>
          {recibido >= total ? (
            <span className="font-display text-2xl font-semibold tracking-tight text-salvia tabular-nums">{formatearPesosCorto(recibido - total)}</span>
          ) : (
            <span className="text-sm font-semibold text-error">No alcanza</span>
          )}
          <button type="button" onClick={limpiar} className="ml-auto text-xs text-tenue underline hover:text-tinta">
            Quitar
          </button>
        </div>
      )}
    </div>
  )
}

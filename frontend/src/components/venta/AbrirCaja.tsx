import { useState, type FormEvent } from 'react'
import { abrirCaja } from '../../lib/cajas'
import { parsearPesos } from '../../lib/dinero'
import { botonPrimario } from '../../lib/estilos'
import { Campo, InputPesos } from '../Campos'

// Para vender tiene que haber una caja abierta: cada venta queda asociada a ella para el cierre.
export function AbrirCaja() {
  const [texto, setTexto] = useState('')
  const monto = texto.trim() ? parsearPesos(texto) : 0

  const abrir = async (evento: FormEvent) => {
    evento.preventDefault()
    if (monto !== null) await abrirCaja(monto)
  }

  return (
    <form onSubmit={abrir} className="mx-4 mt-10 max-w-sm rounded-3xl border border-borde bg-panel p-6 shadow-2xl sm:mx-auto">
      <h1 className="font-display text-3xl font-semibold">Abrir caja</h1>
      <p className="mt-1 text-sm text-tenue">Para empezar a vender, contá el efectivo que hay en la caja.</p>
      <div className="mt-5">
        <Campo etiqueta="Efectivo inicial" error={monto === null ? 'Monto inválido' : null}>
          <InputPesos valor={texto} alCambiar={setTexto} error={monto === null} placeholder="0" autoFocus />
        </Campo>
      </div>
      <button type="submit" disabled={monto === null} className={`${botonPrimario} mt-5 w-full py-3`}>
        Abrir caja
      </button>
    </form>
  )
}

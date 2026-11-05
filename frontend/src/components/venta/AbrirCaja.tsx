import { useState, type FormEvent } from 'react'
import { abrirCaja } from '../../lib/cajas'
import { parsearPesos } from '../../lib/dinero'
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
    <form onSubmit={abrir} className="mx-4 mt-8 max-w-sm sm:mx-auto rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h1 className="text-xl font-bold">Abrir caja</h1>
      <p className="mt-1 text-sm text-slate-500">Para empezar a vender, contá el efectivo que hay en la caja.</p>
      <div className="mt-5">
        <Campo etiqueta="Efectivo inicial" error={monto === null ? 'Monto inválido' : null}>
          <InputPesos valor={texto} alCambiar={setTexto} error={monto === null} placeholder="0" autoFocus />
        </Campo>
      </div>
      <button type="submit" disabled={monto === null} className="mt-5 w-full rounded-lg bg-marca-700 py-3 font-semibold text-white disabled:opacity-40">
        Abrir caja
      </button>
    </form>
  )
}

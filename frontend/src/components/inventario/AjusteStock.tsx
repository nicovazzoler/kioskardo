import { useState, type FormEvent } from 'react'
import { formatearCantidad, parsearCantidad } from '../../lib/cantidad'
import type { MovimientoStockCrear, Producto } from '../../lib/modelos'
import { moverStock } from '../../lib/productos'

type Motivo = MovimientoStockCrear['motivo']

const ACCIONES: { motivo: Motivo; boton: string; pregunta: string }[] = [
  { motivo: 'compra', boton: '+ Ingreso', pregunta: '¿Cuántos entraron?' },
  { motivo: 'merma', boton: '− Merma', pregunta: '¿Cuántos se perdieron o rompieron?' },
  { motivo: 'ajuste', boton: '= Corregir', pregunta: '¿Cuántos hay realmente?' },
]

export function AjusteStock({ producto }: { producto: Producto }) {
  const [motivo, setMotivo] = useState<Motivo | null>(null)
  const [texto, setTexto] = useState('')

  const cantidad = parsearCantidad(texto, producto.unidad)
  const accion = ACCIONES.find((a) => a.motivo === motivo)

  const confirmar = async (evento: FormEvent) => {
    evento.preventDefault()
    if (motivo === null || cantidad === null) return
    await moverStock(producto, motivo, cantidad)
    setMotivo(null)
    setTexto('')
  }

  return (
    <section className="rounded-xl bg-slate-50 p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-slate-600">Stock actual</span>
        <span className="text-2xl font-bold tabular-nums">{formatearCantidad(producto.stock, producto.unidad)}</span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {ACCIONES.map((a) => (
          <button
            key={a.motivo}
            type="button"
            onClick={() => setMotivo(motivo === a.motivo ? null : a.motivo)}
            className={`rounded-lg border px-2 py-2 text-sm font-medium ${
              motivo === a.motivo ? 'border-marca-600 bg-marca-50 text-marca-800' : 'border-slate-200 bg-white text-slate-700'
            }`}
          >
            {a.boton}
          </button>
        ))}
      </div>

      {accion && (
        // Un form aparte (no anidado en el del producto) para que Enter confirme solo el movimiento.
        <form onSubmit={confirmar} className="mt-3 flex gap-2">
          <input
            autoFocus
            inputMode="decimal"
            placeholder={accion.pregunta}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2"
          />
          <button type="submit" disabled={cantidad === null} className="rounded-lg bg-marca-700 px-4 font-medium text-white disabled:opacity-40">
            OK
          </button>
        </form>
      )}
    </section>
  )
}

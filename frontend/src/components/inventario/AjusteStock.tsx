import { useState, type FormEvent } from 'react'
import { formatearCantidad, parsearCantidad } from '../../lib/cantidad'
import { botonPrimario } from '../../lib/estilos'
import type { MovimientoStockCrear, Producto } from '../../lib/modelos'
import { moverStock } from '../../lib/productos'

type Motivo = MovimientoStockCrear['motivo']

const ACCIONES: { motivo: Motivo; boton: string; pregunta: string }[] = [
  { motivo: 'compra', boton: '+ Compra', pregunta: '¿Cuántos entraron?' },
  { motivo: 'merma', boton: '− Merma', pregunta: '¿Cuántos se perdieron o rompieron?' },
  { motivo: 'ajuste', boton: 'Corregir', pregunta: '¿Cuántos hay realmente?' },
]

export function AjusteStock({ producto }: { producto: Producto }) {
  const [motivo, setMotivo] = useState<Motivo | null>(null)
  const [texto, setTexto] = useState('')

  const cantidad = parsearCantidad(texto, producto.unidad)
  const accion = ACCIONES.find((a) => a.motivo === motivo)
  const bajo = producto.stock <= 0 || producto.stock <= producto.stock_minimo

  const confirmar = async (evento: FormEvent) => {
    evento.preventDefault()
    if (motivo === null || cantidad === null) return
    await moverStock(producto, motivo, cantidad)
    setMotivo(null)
    setTexto('')
  }

  return (
    <section className="space-y-3 rounded-2xl bg-elevado p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-tenue">Stock</span>
        <span className={`font-display text-3xl font-semibold tabular-nums ${bajo ? 'text-ambar' : ''}`}>{formatearCantidad(producto.stock, producto.unidad)}</span>
      </div>
      {bajo && producto.stock_minimo > 0 && (
        <p className="text-xs text-tinta-suave">Por debajo del mínimo de {formatearCantidad(producto.stock_minimo, producto.unidad)}</p>
      )}

      <div className="grid grid-cols-3 gap-1.5">
        {ACCIONES.map((a) => (
          <button
            key={a.motivo}
            type="button"
            onClick={() => setMotivo(motivo === a.motivo ? null : a.motivo)}
            aria-pressed={motivo === a.motivo}
            className={`rounded-xl py-2 text-sm font-semibold ${
              motivo === a.motivo ? 'bg-tinta text-fondo' : a.motivo === 'compra' ? 'bg-salvia text-fondo' : 'border border-borde hover:bg-borde'
            }`}
          >
            {a.boton}
          </button>
        ))}
      </div>

      {accion && (
        // Un form aparte (no anidado en el del producto) para que Enter confirme solo el movimiento.
        <form onSubmit={confirmar} className="flex gap-2">
          <input
            autoFocus
            inputMode="decimal"
            placeholder={accion.pregunta}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            className="min-w-0 flex-1 rounded-xl border border-borde bg-fondo px-3 py-2 outline-none placeholder:text-apagado focus:border-ambar"
          />
          <button type="submit" disabled={cantidad === null} className={`${botonPrimario} px-4`}>
            OK
          </button>
        </form>
      )}
    </section>
  )
}

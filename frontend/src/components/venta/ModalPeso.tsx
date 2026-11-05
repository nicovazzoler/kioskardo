import { useState, type FormEvent } from 'react'
import { formatearCantidad, redondearGramos } from '../../lib/cantidad'
import { formatearPesos, parsearPesos } from '../../lib/dinero'
import { claseInput } from '../../lib/estilos'
import type { Producto } from '../../lib/modelos'
import { calcularSubtotal } from '../../lib/ventas'
import { Campo, InputPesos } from '../Campos'
import { Modal } from '../Modal'

type Modo = 'peso' | 'monto'

interface Props {
  producto: Producto
  // subtotal viene solo en modo monto: el cliente pidió "$500 de…" y se cobra eso exacto.
  alConfirmar: (cantidad: number, subtotal?: number) => void
  alCerrar: () => void
}

export function ModalPeso({ producto, alConfirmar, alCerrar }: Props) {
  const [modo, setModo] = useState<Modo>('peso')
  const [texto, setTexto] = useState('')

  let cantidad: number | null = null
  let subtotal: number | null = null
  if (modo === 'peso' && /^\d+$/.test(texto.trim()) && Number(texto) > 0) {
    cantidad = Number(texto) / 1000
    subtotal = calcularSubtotal(producto.precio_venta, cantidad)
  } else if (modo === 'monto') {
    const monto = parsearPesos(texto)
    if (monto) {
      cantidad = redondearGramos(monto / producto.precio_venta)
      subtotal = monto
    }
  }
  const valido = cantidad !== null && cantidad > 0

  const confirmar = (evento: FormEvent) => {
    evento.preventDefault()
    if (!valido) return
    alConfirmar(cantidad!, modo === 'monto' ? subtotal! : undefined)
  }

  return (
    <Modal titulo={producto.nombre} alCerrar={alCerrar}>
      <form onSubmit={confirmar} className="space-y-4">
        <p className="text-sm text-slate-500">{formatearPesos(producto.precio_venta)} el kilo</p>
        <div className="grid grid-cols-2 gap-2">
          {(['peso', 'monto'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setModo(m)
                setTexto('')
              }}
              className={`rounded-lg border py-2 font-medium ${modo === m ? 'border-marca-600 bg-marca-50 text-marca-800' : 'border-slate-300 text-slate-600'}`}
            >
              {m === 'peso' ? 'Por peso' : 'Por monto'}
            </button>
          ))}
        </div>

        {modo === 'peso' ? (
          <Campo etiqueta="Gramos">
            <input key="peso" autoFocus inputMode="numeric" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ej: 250" className={claseInput()} />
          </Campo>
        ) : (
          <Campo etiqueta="¿Cuánta plata?">
            <InputPesos key="monto" autoFocus valor={texto} alCambiar={setTexto} placeholder="Ej: 500" />
          </Campo>
        )}

        <div className="flex items-baseline justify-between rounded-lg bg-slate-50 px-4 py-3">
          <span className="text-slate-600">{valido ? formatearCantidad(cantidad!, 'kg') : '—'}</span>
          <span className="text-xl font-bold tabular-nums">{subtotal ? formatearPesos(subtotal) : '—'}</span>
        </div>

        <button type="submit" disabled={!valido} className="w-full rounded-lg bg-marca-700 py-3 font-semibold text-white disabled:opacity-40">
          Agregar
        </button>
      </form>
    </Modal>
  )
}

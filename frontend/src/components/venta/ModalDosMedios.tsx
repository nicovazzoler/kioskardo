import { useState, type FormEvent } from 'react'
import { formatearPesosCorto, parsearPesos } from '../../lib/dinero'
import { botonPrimario, claseOpcion } from '../../lib/estilos'
import { MEDIOS_PAGO } from '../../lib/mediosPago'
import type { MedioPago, VentaPago } from '../../lib/modelos'
import { nuevoId } from '../../lib/uuid'
import { InputPesos } from '../Campos'
import { Modal } from '../Modal'

interface Props {
  total: number
  alConfirmar: (pagos: VentaPago[]) => void
  alCerrar: () => void
}

export function ModalDosMedios({ total, alConfirmar, alCerrar }: Props) {
  const [primerMedio, setPrimerMedio] = useState<MedioPago>('efectivo')
  const [segundoMedio, setSegundoMedio] = useState<MedioPago>('transferencia')
  const [textoPrimero, setTextoPrimero] = useState('')

  const primero = parsearPesos(textoPrimero)
  const valido = primero !== null && primero > 0 && primero < total && primerMedio !== segundoMedio
  const resto = primero !== null ? total - primero : null

  const confirmar = (evento: FormEvent) => {
    evento.preventDefault()
    if (!valido) return
    alConfirmar([
      { id: nuevoId(), medio: primerMedio, monto: primero, recibido: null },
      { id: nuevoId(), medio: segundoMedio, monto: total - primero, recibido: null },
    ])
  }

  return (
    <Modal titulo="Pagar con dos medios" alCerrar={alCerrar}>
      <form onSubmit={confirmar} className="space-y-5">
        <div className="flex items-baseline justify-between">
          <span className="text-tenue">Total</span>
          <span className="font-display text-4xl font-semibold tabular-nums">{formatearPesosCorto(total)}</span>
        </div>
        <fieldset className="space-y-2">
          <legend className="mb-1.5 text-sm text-tenue">Primer pago</legend>
          <SelectorMedio valor={primerMedio} alCambiar={setPrimerMedio} deshabilitado={segundoMedio} />
          <InputPesos autoFocus valor={textoPrimero} alCambiar={setTextoPrimero} placeholder="Monto" error={!!textoPrimero && !valido} />
        </fieldset>
        <fieldset className="space-y-2">
          <legend className="mb-1.5 text-sm text-tenue">Segundo pago (el resto)</legend>
          <SelectorMedio valor={segundoMedio} alCambiar={setSegundoMedio} deshabilitado={primerMedio} />
          <p className="rounded-xl bg-elevado px-4 py-3 text-right font-display text-2xl font-semibold tabular-nums">
            {resto !== null && resto > 0 ? formatearPesosCorto(resto) : '—'}
          </p>
        </fieldset>
        <button type="submit" disabled={!valido} className={`${botonPrimario} w-full py-4 text-lg`}>
          Confirmar venta
        </button>
      </form>
    </Modal>
  )
}

function SelectorMedio({ valor, alCambiar, deshabilitado }: { valor: MedioPago; alCambiar: (m: MedioPago) => void; deshabilitado: MedioPago }) {
  return (
    <div className="grid grid-cols-5 gap-1 rounded-xl bg-fondo p-1">
      {MEDIOS_PAGO.map((m) => (
        <button
          key={m.valor}
          type="button"
          disabled={m.valor === deshabilitado}
          onClick={() => alCambiar(m.valor)}
          className={`rounded-lg py-2 text-xs font-semibold disabled:opacity-30 ${claseOpcion(valor === m.valor)}`}
        >
          {m.corto}
        </button>
      ))}
    </div>
  )
}

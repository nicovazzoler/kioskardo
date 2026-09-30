import { useState, type FormEvent } from 'react'
import { formatearPesos, parsearPesos } from '../../lib/dinero'
import { MEDIOS_PAGO, sugerenciasDePago } from '../../lib/mediosPago'
import type { MedioPago, VentaPago } from '../../lib/modelos'
import { nuevoId } from '../../lib/uuid'
import { InputPesos } from '../Campos'
import { Modal } from '../Modal'

interface Props {
  total: number
  alConfirmar: (pagos: VentaPago[]) => void
  alCerrar: () => void
}

export function ModalCobro({ total, alConfirmar, alCerrar }: Props) {
  const [dividido, setDividido] = useState(false)

  return (
    <Modal titulo="Cobrar" alCerrar={alCerrar}>
      <div className="mb-4 text-center">
        <p className="text-sm text-slate-500">Total</p>
        <p className="text-4xl font-bold tabular-nums">{formatearPesos(total)}</p>
      </div>
      {dividido ? (
        <PagoDividido total={total} alConfirmar={alConfirmar} />
      ) : (
        <PagoSimple total={total} alConfirmar={alConfirmar} />
      )}
      <button type="button" onClick={() => setDividido(!dividido)} className="mt-4 w-full text-sm text-slate-500 underline">
        {dividido ? 'Pagar con un solo medio' : 'Pagar con dos medios'}
      </button>
    </Modal>
  )
}

function SelectorMedio({ valor, alCambiar, deshabilitado }: { valor: MedioPago; alCambiar: (m: MedioPago) => void; deshabilitado?: MedioPago }) {
  return (
    <div className="grid grid-cols-3 gap-2 md:grid-cols-5">
      {MEDIOS_PAGO.map((m) => (
        <button
          key={m.valor}
          type="button"
          disabled={m.valor === deshabilitado}
          onClick={() => alCambiar(m.valor)}
          className={`flex flex-col items-center rounded-lg border px-1 py-2 text-xs font-medium disabled:opacity-30 ${
            valor === m.valor ? 'border-marca-600 bg-marca-50 text-marca-800' : 'border-slate-200 text-slate-600'
          }`}
        >
          <span className="text-xl">{m.icono}</span>
          {m.nombre}
        </button>
      ))}
    </div>
  )
}

function PagoSimple({ total, alConfirmar }: Omit<Props, 'alCerrar'>) {
  const [medio, setMedio] = useState<MedioPago>('efectivo')
  const [textoRecibido, setTextoRecibido] = useState('')

  // Vacío = pagó justo.
  const recibido = textoRecibido.trim() ? parsearPesos(textoRecibido) : total
  const alcanza = recibido !== null && recibido >= total
  const esEfectivo = medio === 'efectivo'

  const confirmar = (evento: FormEvent) => {
    evento.preventDefault()
    if (esEfectivo && !alcanza) return
    alConfirmar([{ id: nuevoId(), medio, monto: total, recibido: esEfectivo ? recibido : null }])
  }

  return (
    <form onSubmit={confirmar} className="space-y-4">
      <SelectorMedio valor={medio} alCambiar={setMedio} />

      {esEfectivo && (
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="paga-con">
            Paga con
          </label>
          <InputPesos id="paga-con" autoFocus valor={textoRecibido} alCambiar={setTextoRecibido} placeholder="Justo" error={!alcanza} />
          <div className="mt-2 flex gap-2">
            {sugerenciasDePago(total).map((monto) => (
              <button
                key={monto}
                type="button"
                onClick={() => setTextoRecibido(String(monto / 100))}
                className="flex-1 rounded-lg bg-slate-100 py-2 text-sm font-medium tabular-nums text-slate-700"
              >
                {formatearPesos(monto)}
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-baseline justify-between rounded-lg bg-amber-50 px-4 py-3">
            <span className="font-medium text-amber-900">Vuelto</span>
            <span className="text-2xl font-bold tabular-nums text-amber-900">
              {alcanza ? formatearPesos(recibido! - total) : 'No alcanza'}
            </span>
          </div>
        </div>
      )}

      <BotonConfirmar habilitado={!esEfectivo || alcanza} />
    </form>
  )
}

function PagoDividido({ total, alConfirmar }: Omit<Props, 'alCerrar'>) {
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
    <form onSubmit={confirmar} className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-medium text-slate-700">Primer pago</legend>
        <SelectorMedio valor={primerMedio} alCambiar={setPrimerMedio} deshabilitado={segundoMedio} />
        <InputPesos autoFocus valor={textoPrimero} alCambiar={setTextoPrimero} placeholder="Monto" error={!!textoPrimero && !valido} />
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-medium text-slate-700">Segundo pago (el resto)</legend>
        <SelectorMedio valor={segundoMedio} alCambiar={setSegundoMedio} deshabilitado={primerMedio} />
        <p className="rounded-lg bg-slate-50 px-4 py-3 text-right text-xl font-bold tabular-nums">
          {resto !== null && resto > 0 ? formatearPesos(resto) : '—'}
        </p>
      </fieldset>
      <BotonConfirmar habilitado={valido} />
    </form>
  )
}

function BotonConfirmar({ habilitado }: { habilitado: boolean }) {
  return (
    <button type="submit" disabled={!habilitado} className="w-full rounded-lg bg-marca-700 py-4 text-lg font-semibold text-white disabled:opacity-40">
      Confirmar venta
    </button>
  )
}

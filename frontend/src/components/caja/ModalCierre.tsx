import { useState, type FormEvent } from 'react'
import { formatearPesos, parsearPesos } from '../../lib/dinero'
import { claseInput } from '../../lib/estilos'
import { Campo, InputPesos } from '../Campos'
import { Modal } from '../Modal'
import { Diferencia } from './Diferencia'

interface Props {
  esperado: number
  alConfirmar: (montoContado: number, nota: string | null) => void
  alCerrar: () => void
}

// Arqueo: se cuenta el efectivo del cajón y se compara con lo que debería haber.
export function ModalCierre({ esperado, alConfirmar, alCerrar }: Props) {
  const [texto, setTexto] = useState('')
  const [nota, setNota] = useState('')
  const contado = parsearPesos(texto)

  const confirmar = (evento: FormEvent) => {
    evento.preventDefault()
    if (contado !== null) alConfirmar(contado, nota.trim() || null)
  }

  return (
    <Modal titulo="Cerrar caja" alCerrar={alCerrar}>
      <form onSubmit={confirmar} className="space-y-4">
        <div className="flex items-baseline justify-between rounded-lg bg-slate-50 px-4 py-3">
          <span className="text-slate-600">Debería haber</span>
          <span className="text-xl font-bold tabular-nums">{formatearPesos(esperado)}</span>
        </div>
        <Campo etiqueta="Efectivo contado" ayuda="Contá solo los billetes y monedas del cajón.">
          <InputPesos autoFocus valor={texto} alCambiar={setTexto} />
        </Campo>
        {contado !== null && (
          <div className="flex items-baseline justify-between px-1">
            <span className="text-slate-600">Diferencia</span>
            <Diferencia monto={contado - esperado} grande />
          </div>
        )}
        <Campo etiqueta="Nota (opcional)">
          <textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={2} className={claseInput()} placeholder="Ej: faltante por un vuelto mal dado" />
        </Campo>
        <button type="submit" disabled={contado === null} className="w-full rounded-lg bg-marca-700 py-3 font-semibold text-white disabled:opacity-40">
          Cerrar caja
        </button>
      </form>
    </Modal>
  )
}

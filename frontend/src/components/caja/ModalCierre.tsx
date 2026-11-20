import { useState, type FormEvent } from 'react'
import { formatearPesosCorto, parsearPesos } from '../../lib/dinero'
import { botonPrimario, claseInput } from '../../lib/estilos'
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
    <Modal titulo="Cerrar turno" alCerrar={alCerrar}>
      <form onSubmit={confirmar} className="space-y-4">
        <p className="text-tinta-suave">Contá la plata del cajón y anotá cuánto hay. La app te dice si sobra o falta.</p>
        <div className="flex items-baseline justify-between border-y border-linea py-3">
          <span>Debería haber</span>
          <span className="font-display text-3xl font-semibold tracking-tight text-manteca tabular-nums">{formatearPesosCorto(esperado)}</span>
        </div>
        <Campo etiqueta="Efectivo contado" ayuda="Contá solo los billetes y monedas del cajón.">
          <InputPesos autoFocus valor={texto} alCambiar={setTexto} />
        </Campo>
        {contado !== null && (
          <div className="flex items-baseline justify-between border-b border-linea pb-3">
            <span>Diferencia</span>
            <Diferencia monto={contado - esperado} grande />
          </div>
        )}
        <Campo etiqueta="Nota (opcional)">
          <textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={2} className={claseInput()} placeholder="Ej: faltante por un vuelto mal dado" />
        </Campo>
        <button type="submit" disabled={contado === null} className={`${botonPrimario} w-full py-4 text-lg`}>
          Cerrar turno
        </button>
      </form>
    </Modal>
  )
}

import { useState, type FormEvent } from 'react'
import { parsearPesos } from '../../lib/dinero'
import { claseInput } from '../../lib/estilos'
import { Campo, InputPesos } from '../Campos'
import { Modal } from '../Modal'

interface Props {
  alConfirmar: (monto: number, descripcion: string) => void
  alCerrar: () => void
}

// Un monto libre para algo que no está cargado en el inventario. No descuenta stock.
export function ModalVarios({ alConfirmar, alCerrar }: Props) {
  const [texto, setTexto] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const monto = parsearPesos(texto)

  const confirmar = (evento: FormEvent) => {
    evento.preventDefault()
    if (monto) alConfirmar(monto, descripcion.trim())
  }

  return (
    <Modal titulo="Varios" alCerrar={alCerrar}>
      <form onSubmit={confirmar} className="space-y-4">
        <Campo etiqueta="Monto">
          <InputPesos autoFocus valor={texto} alCambiar={setTexto} />
        </Campo>
        <Campo etiqueta="Descripción (opcional)">
          <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Varios" className={claseInput()} />
        </Campo>
        <button type="submit" disabled={!monto} className="w-full rounded-lg bg-marca-700 py-3 font-semibold text-white disabled:opacity-40">
          Agregar
        </button>
      </form>
    </Modal>
  )
}

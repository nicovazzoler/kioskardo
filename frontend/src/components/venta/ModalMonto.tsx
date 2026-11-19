import { useState, type FormEvent } from 'react'
import { parsearPesos } from '../../lib/dinero'
import type { Producto } from '../../lib/modelos'
import { Campo, InputPesos } from '../Campos'
import { botonPrimario } from '../../lib/estilos'
import { Modal } from '../Modal'

interface Props {
  producto: Producto
  alConfirmar: (monto: number) => void
  alCerrar: () => void
}

export function ModalMonto({ producto, alConfirmar, alCerrar }: Props) {
  const [texto, setTexto] = useState('')
  const monto = parsearPesos(texto)

  const confirmar = (evento: FormEvent) => {
    evento.preventDefault()
    if (monto) alConfirmar(monto)
  }

  return (
    <Modal titulo={producto.nombre} alCerrar={alCerrar}>
      <form onSubmit={confirmar} className="space-y-4">
        <Campo etiqueta="Monto" ayuda="El que marca la etiqueta o la balanza.">
          <InputPesos autoFocus valor={texto} alCambiar={setTexto} />
        </Campo>
        <button type="submit" disabled={!monto} className={`${botonPrimario} w-full py-3`}>
          Agregar
        </button>
      </form>
    </Modal>
  )
}

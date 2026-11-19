import { useState, type FormEvent } from 'react'
import { registrarMovimiento } from '../../lib/cajas'
import { parsearPesos } from '../../lib/dinero'
import { botonPrimario, claseInput } from '../../lib/estilos'
import type { TipoMovimientoCaja } from '../../lib/modelos'
import { Campo, InputPesos } from '../Campos'
import { Modal } from '../Modal'

const SUGERENCIAS: Record<TipoMovimientoCaja, string[]> = {
  egreso: ['Pago a proveedor', 'Retiro', 'Gastos'],
  ingreso: ['Cambio', 'Aporte'],
}

interface Props {
  cajaId: string
  tipo: TipoMovimientoCaja
  alCerrar: () => void
}

// Plata que entra o sale del cajón sin ser una venta.
export function ModalMovimiento({ cajaId, tipo, alCerrar }: Props) {
  const [texto, setTexto] = useState('')
  const [motivo, setMotivo] = useState('')
  const monto = parsearPesos(texto)
  const valido = !!monto && !!motivo.trim()

  const confirmar = async (evento: FormEvent) => {
    evento.preventDefault()
    if (!valido) return
    await registrarMovimiento(cajaId, tipo, monto, motivo.trim())
    alCerrar()
  }

  return (
    <Modal titulo={tipo === 'ingreso' ? 'Ingreso de efectivo' : 'Egreso de efectivo'} alCerrar={alCerrar}>
      <form onSubmit={confirmar} className="space-y-4">
        <Campo etiqueta="Monto">
          <InputPesos autoFocus valor={texto} alCambiar={setTexto} />
        </Campo>
        <Campo etiqueta="Motivo">
          <input value={motivo} onChange={(e) => setMotivo(e.target.value)} className={claseInput()} />
        </Campo>
        <div className="flex flex-wrap gap-2">
          {SUGERENCIAS[tipo].map((sugerencia) => (
            <button key={sugerencia} type="button" onClick={() => setMotivo(sugerencia)} className="rounded-full bg-elevado px-3 py-1.5 text-sm text-tinta-suave">
              {sugerencia}
            </button>
          ))}
        </div>
        <button type="submit" disabled={!valido} className={`${botonPrimario} w-full py-3`}>
          Registrar {tipo}
        </button>
      </form>
    </Modal>
  )
}

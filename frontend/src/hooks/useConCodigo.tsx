import { useState } from 'react'
import { TecladoCodigo } from '../components/admin/TecladoCodigo'
import { Modal } from '../components/Modal'
import { codigoCorrecto } from '../lib/codigoAdmin'
import { useKiosko } from '../lib/kiosko'

interface Pedido {
  titulo: string
  accion: () => void
  // Se muestra arriba del teclado. Sin código, se pide confirmar con este texto.
  detalle?: string
}

// Si hay código de admin, lo pide antes de la acción. El modal hay que dibujarlo en el componente que usa el hook.
export function useConCodigo() {
  const kiosko = useKiosko()
  const [pendiente, setPendiente] = useState<Pedido | null>(null)

  const conCodigo = (pedido: Pedido) => {
    if (kiosko?.codigo_admin_hash) setPendiente(pedido)
    else if (!pedido.detalle || confirm(`${pedido.titulo}: ${pedido.detalle}`)) pedido.accion()
  }

  const modalCodigo = pendiente && kiosko && (
    <Modal titulo={pendiente.titulo} alCerrar={() => setPendiente(null)}>
      <div className="pb-2">
        {pendiente.detalle && <p className="mb-2 text-center text-tinta-suave">{pendiente.detalle}</p>}
        <p className="mb-4 text-center text-sm text-tenue">Ingresá el código de admin</p>
        <TecladoCodigo
          alCompletar={async (codigo) => {
            if (!(await codigoCorrecto(kiosko, codigo))) return false
            setPendiente(null)
            pendiente.accion()
            return true
          }}
        />
      </div>
    </Modal>
  )

  return { conCodigo, modalCodigo }
}

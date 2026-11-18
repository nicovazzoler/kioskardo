import { leerColumnas, imprimir } from '../../lib/impresora'
import { useKiosko } from '../../lib/kiosko'
import type { KioskoGuardar, Venta } from '../../lib/modelos'
import { armarTicket } from '../../lib/ticket'
import { Modal } from '../Modal'
import { VistaTicket } from './VistaTicket'

const SIN_DATOS: KioskoGuardar = { nombre: 'Kiosco', direccion: null, telefono: null, pie_ticket: null }

export function ModalTicket({ venta, alCerrar }: { venta: Venta; alCerrar: () => void }) {
  const kiosko = useKiosko()
  const columnas = leerColumnas()
  const lineas = armarTicket(venta, kiosko ?? SIN_DATOS, columnas)

  return (
    <Modal titulo="Ticket" alCerrar={alCerrar}>
      <div className="overflow-x-auto bg-slate-100 py-4">
        <VistaTicket lineas={lineas} columnas={columnas} />
      </div>
      <button autoFocus onClick={() => imprimir(lineas)} className="mt-4 w-full rounded-lg bg-marca-700 py-3 text-lg font-semibold text-white hover:bg-marca-800">
        🖨️ Imprimir
      </button>
      <p className="mt-2 text-center text-xs text-slate-500">Se imprime con la app RawBT. Los datos del negocio y el papel se cambian en Ajustes.</p>
    </Modal>
  )
}

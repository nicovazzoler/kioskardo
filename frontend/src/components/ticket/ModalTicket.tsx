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
      <div className="overflow-x-auto rounded-2xl bg-elevado py-5">
        <VistaTicket lineas={lineas} columnas={columnas} />
      </div>
      <button autoFocus onClick={() => imprimir(lineas)} className="mt-4 w-full rounded-xl bg-tinta py-3 text-lg font-semibold text-fondo hover:bg-white">
        🖨️ Imprimir
      </button>
      <p className="mt-2 text-center text-xs text-tenue">Se imprime con la app RawBT. Los datos del negocio y el papel se cambian en Ajustes.</p>
    </Modal>
  )
}

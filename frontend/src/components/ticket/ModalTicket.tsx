import { botonPrimario } from '../../lib/estilos'
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
      <div className="overflow-x-auto rounded-sm bg-elevado py-5">
        <VistaTicket lineas={lineas} columnas={columnas} />
      </div>
      <button autoFocus onClick={() => imprimir(lineas)} className={`${botonPrimario} mt-4 w-full py-3 text-lg`}>
        Imprimir
      </button>
      <p className="mt-2 text-center text-xs text-tenue">Se imprime con la app RawBT. Los datos del negocio y el papel se cambian en Ajustes.</p>
    </Modal>
  )
}

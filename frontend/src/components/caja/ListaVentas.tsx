import { useState } from 'react'
import { formatearCantidad } from '../../lib/cantidad'
import { formatearPesos, formatearPesosCorto } from '../../lib/dinero'
import { formatearHora } from '../../lib/fechas'
import { MEDIOS_PAGO, nombreMedio } from '../../lib/mediosPago'
import type { Venta } from '../../lib/modelos'
import { anularVenta } from '../../lib/ventas'
import { botonSecundario } from '../../lib/estilos'
import { IconoRecibo } from '../Iconos'
import { ModalTicket } from '../ticket/ModalTicket'

export function ListaVentas({ ventas }: { ventas: Venta[] }) {
  const [ticket, setTicket] = useState<Venta | null>(null)

  if (ventas.length === 0) return <p className="py-8 text-center text-apagado">Todavía no hay ventas en esta caja.</p>

  return (
    <>
      <ul className="divide-y divide-linea overflow-hidden rounded-2xl border border-linea bg-panel">
        {ventas.map((venta) => (
          <li key={venta.id}>
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-tarjeta">
                <span className="w-12 shrink-0 text-sm text-tenue tabular-nums">{formatearHora(venta.creado_en)}</span>
                <span className={`min-w-0 flex-1 truncate ${venta.anulada ? 'text-apagado line-through' : ''}`}>
                  {venta.items.map((i) => i.nombre).join(', ')}
                </span>
                {venta.anulada ? (
                  <span className="rounded-full border border-ambar px-2.5 py-0.5 text-xs font-semibold text-ambar">Anulada</span>
                ) : (
                  <span className="hidden gap-1 sm:flex">
                    {venta.pagos.map((p) => (
                      <span key={p.id} className={`rounded-full px-2.5 py-0.5 text-xs font-semibold text-fondo ${MEDIOS_PAGO.find((m) => m.valor === p.medio)!.color}`}>
                        {nombreMedio(p.medio)}
                      </span>
                    ))}
                  </span>
                )}
                <span className={`w-24 text-right font-bold tabular-nums ${venta.anulada ? 'text-apagado line-through' : ''}`}>{formatearPesosCorto(venta.total)}</span>
                <span className="text-apagado transition-transform group-open:rotate-90">›</span>
              </summary>
              <div className="space-y-3 bg-tarjeta px-4 py-3 text-sm">
                <table className="w-full">
                  <tbody>
                    {venta.items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-0.5 text-tenue tabular-nums">
                          {Number.isInteger(item.cantidad) ? `${item.cantidad}×` : formatearCantidad(item.cantidad, 'kg')}
                        </td>
                        <td className="w-full px-2">{item.nombre}</td>
                        <td className="text-right tabular-nums">{formatearPesos(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-tenue">
                  {venta.pagos.map((p) => `${nombreMedio(p.medio)} ${formatearPesos(p.monto)}`).join(' + ')}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setTicket(venta)} className={`${botonSecundario} flex items-center gap-1.5 px-3 py-1.5`}>
                    <IconoRecibo tamano={16} />
                    Ticket
                  </button>
                  {!venta.anulada && (
                    <button
                      onClick={() => confirm(`¿Anular la venta de ${formatearPesos(venta.total)}? El stock vuelve al inventario.`) && anularVenta(venta)}
                      className="rounded-xl border border-error/40 px-3 py-1.5 font-medium text-error hover:bg-error/10"
                    >
                      Anular venta
                    </button>
                  )}
                </div>
              </div>
            </details>
          </li>
        ))}
      </ul>
      {ticket && <ModalTicket venta={ticket} alCerrar={() => setTicket(null)} />}
    </>
  )
}

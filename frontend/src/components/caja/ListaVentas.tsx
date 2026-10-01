import { formatearCantidad } from '../../lib/cantidad'
import { formatearPesos } from '../../lib/dinero'
import { formatearHora } from '../../lib/fechas'
import { nombreMedio } from '../../lib/mediosPago'
import type { Venta } from '../../lib/modelos'
import { anularVenta } from '../../lib/ventas'

export function ListaVentas({ ventas }: { ventas: Venta[] }) {
  if (ventas.length === 0) return <p className="py-8 text-center text-slate-400">Todavía no hay ventas en esta caja.</p>

  return (
    <ul className="divide-y divide-slate-100 rounded-xl bg-white ring-1 ring-slate-200">
      {ventas.map((venta) => (
        <li key={venta.id}>
          {/* <details> es un desplegable nativo de HTML: no necesita estado de React. */}
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-slate-50">
              <span className="w-12 shrink-0 text-sm text-slate-500 tabular-nums">{formatearHora(venta.creado_en)}</span>
              <span className={`min-w-0 flex-1 truncate ${venta.anulada ? 'text-slate-400 line-through' : ''}`}>
                {venta.items.map((i) => i.nombre).join(', ')}
              </span>
              {venta.anulada && <span className="rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">Anulada</span>}
              <span className={`font-semibold tabular-nums ${venta.anulada ? 'text-slate-400 line-through' : ''}`}>{formatearPesos(venta.total)}</span>
              <span className="text-slate-400 transition-transform group-open:rotate-90">›</span>
            </summary>
            <div className="space-y-3 bg-slate-50 px-4 py-3 text-sm">
              <table className="w-full">
                <tbody>
                  {venta.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-0.5 text-slate-500 tabular-nums">
                        {Number.isInteger(item.cantidad) ? `${item.cantidad}×` : formatearCantidad(item.cantidad, 'kg')}
                      </td>
                      <td className="w-full px-2">{item.nombre}</td>
                      <td className="text-right tabular-nums">{formatearPesos(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-slate-600">
                {venta.pagos.map((p) => `${nombreMedio(p.medio)} ${formatearPesos(p.monto)}`).join(' + ')}
              </p>
              {!venta.anulada && (
                <button
                  onClick={() => confirm(`¿Anular la venta de ${formatearPesos(venta.total)}? El stock vuelve al inventario.`) && anularVenta(venta)}
                  className="rounded-lg border border-red-200 px-3 py-1.5 font-medium text-red-700 hover:bg-red-50"
                >
                  Anular venta
                </button>
              )}
            </div>
          </details>
        </li>
      ))}
    </ul>
  )
}

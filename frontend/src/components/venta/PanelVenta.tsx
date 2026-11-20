import type { Carrito, ItemCarrito } from '../../hooks/useCarrito'
import { formatearPesosCorto } from '../../lib/dinero'
import { botonPrimario, botonSecundario, claseOpcion, rotulo } from '../../lib/estilos'
import { describirLinea } from '../../lib/lineaVenta'
import { MEDIOS_PAGO } from '../../lib/mediosPago'
import type { MedioPago, Producto, Venta } from '../../lib/modelos'
import { IconoBasura, IconoRecibo } from '../Iconos'
import { VueltoOpcional } from './VueltoOpcional'

interface Props {
  carrito: Carrito
  productoDe: (id: string | null) => Producto | undefined
  medio: MedioPago
  alCambiarMedio: (medio: MedioPago) => void
  recibido: number | null
  alCambiarRecibido: (recibido: number | null) => void
  ultimaVenta: { venta: Venta; vuelto: number } | null
  alVerTicket: (venta: Venta) => void
  alVarios: () => void
  alDosMedios: () => void
  alCobrar: () => void
  // Dentro de la hoja del celular el título ya lo pone el modal.
  enHoja?: boolean
}

export function PanelVenta(props: Props) {
  const { carrito, medio, recibido, ultimaVenta } = props
  const hayItems = carrito.items.length > 0
  const articulos = carrito.items.reduce((suma, i) => suma + (i.unidad === 'kg' ? 1 : i.cantidad), 0)
  const noAlcanza = medio === 'efectivo' && recibido !== null && recibido < carrito.total

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          {!props.enHoja && <h2 className="font-display text-[22px] font-semibold tracking-tight">Venta actual</h2>}
          <p className="text-sm text-tenue">{hayItems ? `${articulos} ${articulos === 1 ? 'artículo' : 'artículos'}` : 'Sin productos'}</p>
        </div>
        <div className="-mr-2 flex">
          <button onClick={props.alVarios} className={`${botonSecundario} h-11 px-2 text-sm`}>
            Varios $
          </button>
          {hayItems && (
            <button
              onClick={() => confirm('¿Vaciar la venta?') && carrito.vaciar()}
              className={`${botonSecundario} flex h-11 w-11 items-center justify-center`}
              aria-label="Vaciar la venta"
            >
              <IconoBasura tamano={18} />
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {hayItems ? (
          <ul>
            {carrito.items.map((item) => (
              <LineaVenta key={item.id} item={item} producto={props.productoDe(item.producto_id)} carrito={carrito} />
            ))}
          </ul>
        ) : ultimaVenta ? (
          <div className="space-y-2 border-b border-linea pb-4">
            <p className={`${rotulo} text-ok`}>Venta registrada</p>
            <p className="font-display text-3xl font-semibold tracking-tight tabular-nums">{formatearPesosCorto(ultimaVenta.venta.total)}</p>
            {ultimaVenta.vuelto > 0 && (
              <p className="flex items-baseline justify-between">
                <span>Vuelto</span>
                <span className="font-display text-3xl font-semibold tracking-tight text-salvia tabular-nums">{formatearPesosCorto(ultimaVenta.vuelto)}</span>
              </p>
            )}
            <button onClick={() => props.alVerTicket(ultimaVenta.venta)} className={`${botonSecundario} -ml-2 flex items-center gap-2 px-2 py-2 text-sm`}>
              <IconoRecibo tamano={18} />
              Ver ticket
            </button>
          </div>
        ) : (
          <p className="pt-8 text-center text-tenue">Escaneá un producto o tocalo en la lista.</p>
        )}
      </div>

      <div className="flex items-baseline justify-between border-t border-borde pt-3">
        <span className="text-tinta-suave">Total</span>
        <span className="font-display text-4xl font-semibold tracking-tight tabular-nums">{formatearPesosCorto(carrito.total)}</span>
      </div>

      <div role="group" aria-label="Medio de pago" className="flex justify-between border-b border-linea">
        {MEDIOS_PAGO.map((m) => (
          <button key={m.valor} onClick={() => props.alCambiarMedio(m.valor)} aria-pressed={medio === m.valor} className={`h-11 text-[13px] ${claseOpcion(medio === m.valor)}`}>
            {m.corto}
          </button>
        ))}
      </div>

      {medio === 'efectivo' && hayItems && <VueltoOpcional total={carrito.total} recibido={recibido} alCambiar={props.alCambiarRecibido} />}

      <button onClick={props.alCobrar} disabled={!hayItems || noAlcanza} className={`${botonPrimario} flex h-14 shrink-0 items-center justify-between px-5 text-lg`}>
        <span>Cobrar</span>
        <span className="font-display text-xl tracking-tight tabular-nums">{formatearPesosCorto(carrito.total)}</span>
      </button>
      {hayItems && (
        <button onClick={props.alDosMedios} className="-mt-2 self-center text-sm text-tenue underline underline-offset-4 hover:text-tinta">
          Pagar con dos medios
        </button>
      )}
    </div>
  )
}

function LineaVenta({ item, producto, carrito }: { item: ItemCarrito; producto: Producto | undefined; carrito: Carrito }) {
  const esPesable = item.unidad === 'kg'
  const esLibre = !producto || producto.precio_libre
  const { cantidad, detalle } = describirLinea(item, producto)

  return (
    <li className="border-b border-linea pt-2 last:border-b-0">
      <div className="flex items-baseline gap-2">
        <span className="min-w-14 font-bold whitespace-nowrap text-ambar tabular-nums">{cantidad}</span>
        <p className="min-w-0 flex-1 truncate font-semibold">{item.nombre}</p>
        <span className="font-display font-semibold tabular-nums">{formatearPesosCorto(item.subtotal)}</span>
      </div>
      <div className="flex items-center justify-between pl-16 text-xs text-tenue">
        <span>{detalle}</span>
        <div className="-mr-2 flex">
          {!esPesable && !esLibre && (
            <>
              <BotonChico etiqueta="Uno menos" alTocar={() => carrito.cambiarCantidad(item.id, item.cantidad - 1)}>
                −
              </BotonChico>
              <BotonChico etiqueta="Uno más" alTocar={() => carrito.cambiarCantidad(item.id, item.cantidad + 1)}>
                +
              </BotonChico>
            </>
          )}
          <BotonChico etiqueta="Quitar" alTocar={() => carrito.quitar(item.id)}>
            ×
          </BotonChico>
        </div>
      </div>
    </li>
  )
}

function BotonChico({ etiqueta, alTocar, children }: { etiqueta: string; alTocar: () => void; children: string }) {
  return (
    <button onClick={alTocar} aria-label={etiqueta} className="flex h-9 w-9 items-center justify-center text-base leading-none text-tenue hover:text-tinta">
      {children}
    </button>
  )
}

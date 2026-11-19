import type { Carrito, ItemCarrito } from '../../hooks/useCarrito'
import { datosCategoria } from '../../lib/categorias'
import { formatearPesosCorto } from '../../lib/dinero'
import { botonPrimario, botonSecundario, claseOpcion } from '../../lib/estilos'
import { MEDIOS_PAGO } from '../../lib/mediosPago'
import type { MedioPago, Producto, Venta } from '../../lib/modelos'
import { IconoBasura, IconoRecibo } from '../Iconos'
import { ICONOS_MEDIO } from '../iconosPorTipo'
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
      <div className="flex items-start justify-between gap-3">
        <div>
          {!props.enHoja && <h2 className="font-display text-2xl font-semibold">Venta actual</h2>}
          <p className="text-sm text-tenue">{hayItems ? `${articulos} ${articulos === 1 ? 'artículo' : 'artículos'}` : 'Sin productos'}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={props.alVarios} className={`${botonSecundario} h-10 px-3 text-sm`}>
            Varios $
          </button>
          {hayItems && (
            <button
              onClick={() => confirm('¿Vaciar la venta?') && carrito.vaciar()}
              className={`${botonSecundario} flex h-10 w-10 items-center justify-center text-tenue`}
              aria-label="Vaciar la venta"
            >
              <IconoBasura tamano={18} />
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {hayItems ? (
          <ul className="divide-y divide-linea">
            {carrito.items.map((item) => (
              <LineaVenta key={item.id} item={item} producto={props.productoDe(item.producto_id)} carrito={carrito} />
            ))}
          </ul>
        ) : ultimaVenta ? (
          <div className="space-y-3 rounded-2xl bg-elevado p-4">
            <p className="text-sm text-tenue">✓ Venta registrada</p>
            <p className="font-display text-3xl font-semibold tabular-nums">{formatearPesosCorto(ultimaVenta.venta.total)}</p>
            {ultimaVenta.vuelto > 0 && (
              <p className="flex items-baseline justify-between">
                <span>Vuelto</span>
                <span className="font-display text-3xl font-semibold text-salvia tabular-nums">{formatearPesosCorto(ultimaVenta.vuelto)}</span>
              </p>
            )}
            <button onClick={() => props.alVerTicket(ultimaVenta.venta)} className={`${botonSecundario} flex w-full items-center justify-center gap-2 py-2.5 text-sm`}>
              <IconoRecibo tamano={18} />
              Ticket
            </button>
          </div>
        ) : (
          <p className="pt-8 text-center text-tenue">Escaneá un producto o tocalo en la lista.</p>
        )}
      </div>

      <div className="flex items-baseline justify-between border-t border-dashed border-borde pt-4">
        <span>Total</span>
        <span className="font-display text-4xl font-semibold tabular-nums">{formatearPesosCorto(carrito.total)}</span>
      </div>

      <div className="grid grid-cols-5 gap-1.5">
        {MEDIOS_PAGO.map((m) => {
          const Icono = ICONOS_MEDIO[m.valor]
          return (
            <button
              key={m.valor}
              onClick={() => props.alCambiarMedio(m.valor)}
              aria-pressed={medio === m.valor}
              className={`flex h-15 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold ${
                medio === m.valor ? 'bg-tinta text-fondo' : 'border border-borde text-tinta hover:bg-elevado'
              }`}
            >
              <Icono tamano={18} />
              {m.corto}
            </button>
          )
        })}
      </div>

      {medio === 'efectivo' && hayItems && <VueltoOpcional total={carrito.total} recibido={recibido} alCambiar={props.alCambiarRecibido} />}

      <button onClick={props.alCobrar} disabled={!hayItems || noAlcanza} className={`${botonPrimario} flex h-14 items-center justify-between px-5 text-lg`}>
        <span>Cobrar</span>
        <span className="font-display text-xl tabular-nums">{formatearPesosCorto(carrito.total)}</span>
      </button>
      {hayItems && (
        <button onClick={props.alDosMedios} className={`-mt-2 self-center text-sm underline ${claseOpcion(false)}`}>
          Pagar con dos medios
        </button>
      )}
    </div>
  )
}

function LineaVenta({ item, producto, carrito }: { item: ItemCarrito; producto: Producto | undefined; carrito: Carrito }) {
  const color = datosCategoria(producto?.categoria)?.color ?? 'bg-arena'
  const esPesable = item.unidad === 'kg'
  const esLibre = !producto || producto.precio_libre
  const insignia = esPesable ? `${Math.round(item.cantidad * 1000)} g` : String(item.cantidad)
  const detalle = esPesable
    ? `${formatearPesosCorto(item.precio_unitario)} el kilo`
    : !item.producto_id
      ? 'Monto libre'
      : esLibre
        ? 'Precio libre'
        : `${item.cantidad} × ${formatearPesosCorto(item.precio_unitario)}`

  return (
    <li className="flex gap-3 py-2.5">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-fondo ${color} ${esPesable ? 'text-[11px]' : ''}`}>
        {insignia}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate font-semibold">{item.nombre}</p>
          <span className="shrink-0 font-semibold tabular-nums">{formatearPesosCorto(item.subtotal)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="text-xs text-tenue">{detalle}</p>
          <div className="flex gap-1">
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
      </div>
    </li>
  )
}

function BotonChico({ etiqueta, alTocar, children }: { etiqueta: string; alTocar: () => void; children: string }) {
  return (
    <button onClick={alTocar} aria-label={etiqueta} className="flex h-8 w-8 items-center justify-center rounded-lg bg-elevado text-lg leading-none text-tinta-suave hover:bg-borde">
      {children}
    </button>
  )
}

import { formatearPesosCorto } from './dinero'
import type { Producto, Unidad, VentaItem } from './modelos'

type Linea = Pick<VentaItem, 'producto_id' | 'cantidad' | 'precio_unitario'> & { unidad: Unidad }

// Lo usan el panel de la caja y la pantalla del cliente, así las dos muestran lo mismo.
export function describirLinea(item: Linea, producto: Producto | undefined) {
  if (item.unidad === 'kg') {
    return { cantidad: `${Math.round(item.cantidad * 1000)} g`, detalle: `${formatearPesosCorto(item.precio_unitario)} el kilo` }
  }
  const detalle = !item.producto_id
    ? 'Monto libre'
    : !producto || producto.precio_libre
      ? 'Precio libre'
      : `${item.cantidad} × ${formatearPesosCorto(item.precio_unitario)}`
  return { cantidad: String(item.cantidad), detalle }
}

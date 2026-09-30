import { redondearGramos } from './cantidad'
import { db } from './db'
import type { Venta, VentaItem, VentaPago } from './modelos'
import { encolar } from './sincronizacion'
import { nuevoId } from './uuid'

export function calcularSubtotal(precioUnitario: number, cantidad: number): number {
  return Math.round(precioUnitario * cantidad)
}

export function calcularTotal(items: Pick<VentaItem, 'subtotal'>[]): number {
  return items.reduce((suma, item) => suma + item.subtotal, 0)
}

export async function registrarVenta(cajaId: string, items: VentaItem[], pagos: VentaPago[]): Promise<Venta> {
  const venta: Venta = {
    id: nuevoId(),
    caja_id: cajaId,
    total: calcularTotal(items),
    anulada: false,
    creado_en: new Date().toISOString(),
    items,
    pagos,
  }

  await db.transaction('rw', db.ventas, db.productos, async () => {
    await db.ventas.put(venta)
    for (const item of items) {
      if (!item.producto_id) continue
      const producto = await db.productos.get(item.producto_id)
      if (producto) await db.productos.update(producto.id, { stock: redondearGramos(producto.stock - item.cantidad) })
    }
  })

  const { id, total: _total, anulada: _anulada, ...cuerpo } = venta
  await encolar('PUT', `/ventas/${id}`, cuerpo, 'ventas')
  return venta
}

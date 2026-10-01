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
    await moverStockLocal(items, -1)
  })

  const { id, total: _total, anulada: _anulada, ...cuerpo } = venta
  await encolar('PUT', `/ventas/${id}`, cuerpo, 'ventas')
  return venta
}

// Marca la venta como anulada y devuelve al stock local lo que había salido.
export async function anularVenta(venta: Venta) {
  await db.transaction('rw', db.ventas, db.productos, async () => {
    await db.ventas.update(venta.id, { anulada: true })
    await moverStockLocal(venta.items, +1)
  })
  await encolar('POST', `/ventas/${venta.id}/anular`, {}, 'ventas')
}

// signo -1 al vender, +1 al anular. Los ítems "Varios" no tienen producto y se saltean.
async function moverStockLocal(items: VentaItem[], signo: 1 | -1) {
  for (const item of items) {
    if (!item.producto_id) continue
    const producto = await db.productos.get(item.producto_id)
    if (producto) await db.productos.update(producto.id, { stock: redondearGramos(producto.stock + signo * item.cantidad) })
  }
}

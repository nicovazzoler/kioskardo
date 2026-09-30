import { db } from './db'
import type { MovimientoStockCrear, Producto, ProductoGuardar } from './modelos'
import { encolar } from './sincronizacion'
import { nuevoId } from './uuid'

// Todas las escrituras siguen el mismo patrón: primero se aplican en la base local
// (la pantalla se actualiza al instante) y después se encolan para subir al servidor.

export async function guardarProducto(id: string, datos: ProductoGuardar) {
  const existente = await db.productos.get(id)
  await db.productos.put({ ...datos, id, stock: existente?.stock ?? 0 })
  await encolar('PUT', `/productos/${id}`, datos)
}

export async function moverStock(producto: Producto, motivo: MovimientoStockCrear['motivo'], cantidad: number) {
  const movimiento: MovimientoStockCrear = { id: nuevoId(), motivo, cantidad }
  const stock = { compra: producto.stock + cantidad, merma: producto.stock - cantidad, ajuste: cantidad }[motivo]
  // Redondeo a gramos: en kg, 0.1 + 0.2 daría 0.30000000000000004.
  await db.productos.update(producto.id, { stock: Math.round(stock * 1000) / 1000 })
  await encolar('POST', `/productos/${producto.id}/movimientos-stock`, movimiento)
}

export function buscarPorCodigo(codigo: string): Promise<Producto | undefined> {
  return db.productos.where('codigo_barras').equals(codigo.trim()).first()
}

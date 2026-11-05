import { redondearGramos } from './cantidad'
import { db } from './db'
import type { MovimientoStockCrear, Producto, ProductoGuardar } from './modelos'
import { encolar } from './sincronizacion'
import { nuevoId } from './uuid'

// Todas las escrituras siguen el mismo patrón: primero se aplican en la base local
// (la pantalla se actualiza al instante) y después se encolan para subir al servidor.

export async function guardarProducto(id: string, datos: ProductoGuardar) {
  const existente = await db.productos.get(id)
  await db.productos.put({ ...datos, id, stock: existente?.stock ?? 0 })
  await encolar('PUT', `/productos/${id}`, datos, 'productos')
}

export async function moverStock(producto: Producto, motivo: MovimientoStockCrear['motivo'], cantidad: number) {
  const movimiento: MovimientoStockCrear = { id: nuevoId(), motivo, cantidad }
  const stock = { compra: producto.stock + cantidad, merma: producto.stock - cantidad, ajuste: cantidad }[motivo]
  await db.productos.update(producto.id, { stock: redondearGramos(stock) })
  await encolar('POST', `/productos/${producto.id}/movimientos-stock`, movimiento, 'productos')
}

export function buscarPorCodigo(codigo: string): Promise<Producto | undefined> {
  return db.productos.where('codigo_barras').equals(codigo.trim()).first()
}

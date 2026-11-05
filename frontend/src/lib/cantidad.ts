import type { Unidad } from './modelos'

// "12" -> 12, "1,5" -> 1.5. Hasta 3 decimales (gramos). null si no es válido.
export function parsearCantidad(texto: string, unidad: Unidad): number | null {
  const limpio = texto.trim().replace(',', '.')
  const patron = unidad === 'unidad' ? /^\d+$/ : /^\d+(\.\d{1,3})?$/
  return patron.test(limpio) ? Number(limpio) : null
}

const formateador = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 3 })

export function formatearCantidad(cantidad: number, unidad: Unidad): string {
  return unidad === 'kg' ? `${formateador.format(cantidad)} kg` : formateador.format(cantidad)
}

// Redondeo a 3 decimales: en kg, 0.1 + 0.2 daría 0.30000000000000004.
export function redondearGramos(cantidad: number): number {
  return Math.round(cantidad * 1000) / 1000
}

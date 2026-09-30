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

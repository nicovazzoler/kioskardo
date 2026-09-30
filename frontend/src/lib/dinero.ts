// Los montos viajan y se guardan como enteros en centavos: 150050 = $1.500,50.
// Así se evitan errores de redondeo tipo 0.1 + 0.2 = 0.30000000000000004.

const formateador = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
})

export function formatearPesos(centavos: number): string {
  return formateador.format(centavos / 100)
}

// Texto para precargar un input de precio: 150050 -> "1500,50", 150000 -> "1500".
export function centavosATexto(centavos: number | null): string {
  if (centavos === null) return ''
  const pesos = centavos / 100
  return Number.isInteger(pesos) ? String(pesos) : pesos.toFixed(2).replace('.', ',')
}

// Interpreta lo que se tipea en un campo de precio y devuelve centavos, o null si no es válido.
// Acepta formato argentino ("1.500,50") y también punto decimal ("1500.5").
export function parsearPesos(texto: string): number | null {
  let limpio = texto.replace(/[\s$]/g, '')
  if (!limpio) return null

  if (limpio.includes(',')) {
    limpio = limpio.replace(/\./g, '').replace(',', '.')
  } else if (/^\d{1,3}(\.\d{3})+$/.test(limpio)) {
    // "1.500" o "1.500.000": en Argentina el punto sin coma son miles.
    limpio = limpio.replace(/\./g, '')
  }

  if (!/^\d+(\.\d{1,2})?$/.test(limpio)) return null
  return Math.round(Number(limpio) * 100)
}

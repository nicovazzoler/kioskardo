// Los montos viajan y se guardan como enteros en centavos: 150050 = $1.500,50.
// Así se evitan errores de redondeo tipo 0.1 + 0.2 = 0.30000000000000004.

const formateador = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
})

export function formatearPesos(centavos: number): string {
  return formateador.format(centavos / 100)
}

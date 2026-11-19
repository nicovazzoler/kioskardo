export function claseInput(conError = false) {
  return `w-full min-w-0 rounded-xl border bg-fondo px-3 py-2.5 text-base text-tinta placeholder:text-apagado outline-none focus:border-ambar ${
    conError ? 'border-error' : 'border-borde'
  }`
}

export const botonPrimario = 'rounded-2xl bg-tinta font-bold text-fondo hover:bg-white disabled:opacity-40'

export const botonSecundario = 'rounded-xl border border-borde font-semibold text-tinta hover:bg-elevado disabled:opacity-40'

// Una opción de un grupo (medio de pago, unidad, filtro): la elegida resalta en crema.
export function claseOpcion(elegida: boolean) {
  return elegida ? 'bg-tinta text-fondo' : 'text-tinta-suave hover:bg-elevado'
}

// Fondo un poco más claro y sin borde: se reconoce como campo sin parecer una caja.
export function claseInput(conError = false) {
  return `w-full min-w-0 rounded-sm bg-elevado px-3 py-2.5 text-base text-tinta placeholder:text-apagado outline-none ring-1 ring-inset focus:ring-ambar ${
    conError ? 'ring-error' : 'ring-transparent'
  }`
}

// El único botón relleno de cada pantalla: el resto son texto.
export const botonPrimario = 'rounded-md bg-tinta font-bold text-fondo hover:bg-white disabled:opacity-40'

export const botonSecundario = 'rounded-md font-semibold text-tinta-suave hover:bg-elevado hover:text-tinta disabled:opacity-40'

// Una opción de un grupo (medio de pago, unidad, filtro): la elegida se subraya en ámbar.
export function claseOpcion(elegida: boolean) {
  return elegida ? 'font-semibold text-tinta shadow-[inset_0_-2px_0_var(--color-ambar)]' : 'text-tenue hover:text-tinta'
}

// Rótulos chicos en mayúsculas: estados ("EN LÍNEA"), medios de pago en las listas, encabezados de tabla.
export const rotulo = 'text-[11px] font-bold tracking-[0.1em] uppercase'

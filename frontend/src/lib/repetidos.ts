// La cámara lee el mismo código en cada cuadro mientras sigue enfocado. Solo cuenta de nuevo si
// estuvo un rato sin verse: dos latas iguales pasadas de a una son dos, una lata quieta es una.
export function crearFiltroDeRepetidos(ausenciaMs = 700) {
  const vistoPorUltimaVez = new Map<string, number>()

  return (codigo: string, ahora: number): boolean => {
    const anterior = vistoPorUltimaVez.get(codigo)
    vistoPorUltimaVez.set(codigo, ahora)
    return anterior === undefined || ahora - anterior > ausenciaMs
  }
}

import { describe, expect, it } from 'vitest'
import { crearFiltroDeRepetidos } from './repetidos'

// Simula la cámara leyendo cada 150 ms: devuelve en qué momentos el filtro dejó pasar el código.
function leer(filtro: ReturnType<typeof crearFiltroDeRepetidos>, codigo: string, desde: number, hasta: number) {
  const pasaron: number[] = []
  for (let t = desde; t <= hasta; t += 150) if (filtro(codigo, t)) pasaron.push(t)
  return pasaron
}

describe('crearFiltroDeRepetidos', () => {
  it('un código quieto frente a la cámara cuenta una sola vez', () => {
    const filtro = crearFiltroDeRepetidos()
    expect(leer(filtro, 'A', 0, 3000)).toEqual([0])
  })

  it('si sale de cuadro y vuelve, cuenta de nuevo', () => {
    const filtro = crearFiltroDeRepetidos()
    expect(leer(filtro, 'A', 0, 600)).toEqual([0])
    expect(leer(filtro, 'A', 1500, 2000)).toEqual([1500])
  })

  it('un cuadro perdido en el medio no lo cuenta dos veces', () => {
    const filtro = crearFiltroDeRepetidos()
    expect(filtro('A', 0)).toBe(true)
    expect(filtro('A', 450)).toBe(false)
  })

  it('dos códigos en cuadro a la vez cuentan una vez cada uno', () => {
    const filtro = crearFiltroDeRepetidos()
    const pasaron = []
    for (let t = 0; t <= 1500; t += 150) {
      if (filtro('A', t)) pasaron.push('A')
      if (filtro('B', t)) pasaron.push('B')
    }
    expect(pasaron).toEqual(['A', 'B'])
  })
})

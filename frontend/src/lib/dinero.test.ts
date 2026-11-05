import { describe, expect, it } from 'vitest'
import { centavosATexto, parsearPesos } from './dinero'

describe('parsearPesos', () => {
  it.each([
    ['1500', 150000],
    ['1500,50', 150050],
    ['1500.5', 150050],
    ['1.500', 150000],
    ['1.500,50', 150050],
    ['1.500.000', 150000000],
    ['$ 2.300', 230000],
    ['0,99', 99],
  ])('%s -> %i centavos', (texto, esperado) => {
    expect(parsearPesos(texto)).toBe(esperado)
  })

  it.each(['', 'abc', '1,2,3', '-5', '12,345'])('"%s" es inválido', (texto) => {
    expect(parsearPesos(texto)).toBeNull()
  })
})

describe('centavosATexto', () => {
  it('vuelve al formato editable', () => {
    expect(centavosATexto(150000)).toBe('1500')
    expect(centavosATexto(150050)).toBe('1500,50')
    expect(centavosATexto(null)).toBe('')
  })

  it('ida y vuelta da lo mismo', () => {
    for (const centavos of [0, 1, 99, 150050, 123456789]) {
      expect(parsearPesos(centavosATexto(centavos))).toBe(centavos)
    }
  })
})

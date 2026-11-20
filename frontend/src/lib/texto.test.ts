import { describe, expect, it } from 'vitest'
import { normalizar, pareceCodigoDeBarras, unirConY } from './texto'

describe('normalizar', () => {
  it('saca tildes, mayúsculas y espacios de los bordes', () => {
    expect(normalizar('  Alfajór JORGITO ')).toBe('alfajor jorgito')
    expect(normalizar('Ñandú')).toBe('nandu')
  })
})

describe('pareceCodigoDeBarras', () => {
  it('son 6 dígitos o más', () => {
    expect(pareceCodigoDeBarras('7790580123456')).toBe(true)
    expect(pareceCodigoDeBarras('12345')).toBe(false)
    expect(pareceCodigoDeBarras('coca 500')).toBe(false)
  })
})

describe('unirConY', () => {
  it('une con comas y una "y" antes del último', () => {
    expect(unirConY([])).toBe('')
    expect(unirConY(['Juan'])).toBe('Juan')
    expect(unirConY(['Juan', 'Ana'])).toBe('Juan y Ana')
    expect(unirConY(['Juan', 'Ana', 'Luis'])).toBe('Juan, Ana y Luis')
  })
})

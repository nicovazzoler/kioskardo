import { describe, expect, it } from 'vitest'
import { sugerenciasDePago } from './mediosPago'

describe('sugerenciasDePago', () => {
  it('sugiere billetes que cubren el total, sin repetir', () => {
    expect(sugerenciasDePago(370000)).toEqual([400000, 1000000, 2000000])
  })

  it('no sugiere el monto justo', () => {
    expect(sugerenciasDePago(400000)).toEqual([1000000, 2000000])
  })
})

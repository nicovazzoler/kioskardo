import { describe, expect, it } from 'vitest'
import { aEscPos, urlRawbt } from './impresora'

describe('aEscPos', () => {
  it('inicializa la impresora en CP850 y termina cortando el papel', () => {
    const bytes = [...aEscPos([{ texto: 'hola' }])]
    expect(bytes.slice(0, 5)).toEqual([0x1b, 0x40, 0x1b, 0x74, 2])
    expect(bytes.slice(-4)).toEqual([0x1d, 0x56, 0x42, 0])
  })

  it('traduce los acentos a CP850 y lo desconocido a "?"', () => {
    const bytes = [...aEscPos([{ texto: 'ñ€' }])]
    const inicioTexto = 5 + 9
    expect(bytes.slice(inicioTexto, inicioTexto + 3)).toEqual([0xa4, 0x3f, 0x0a])
  })
})

describe('urlRawbt', () => {
  it('manda los bytes en base64 por el esquema de RawBT', () => {
    const url = urlRawbt(Uint8Array.from([0x1b, 0x40, 0xa4]))
    expect(url).toBe('rawbt:base64,' + btoa('\x1b\x40\xa4'))
  })
})

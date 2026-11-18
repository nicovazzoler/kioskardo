import { describe, expect, it } from 'vitest'
import type { KioskoGuardar, Venta } from './modelos'
import { armarTicket, partir } from './ticket'

const kiosko: KioskoGuardar = { nombre: 'Kiosco Lucho', direccion: 'Av. Siempreviva 742', telefono: null, pie_ticket: null }

const venta: Venta = {
  id: '7f3a91c2-0000-4000-8000-000000000000',
  caja_id: 'caja',
  total: 1070000,
  anulada: false,
  creado_en: '2026-11-18T18:42:00.000Z',
  items: [
    { id: '1', producto_id: 'a', nombre: 'Gaseosa cola 500 ml', precio_unitario: 250000, cantidad: 2, subtotal: 500000 },
    { id: '2', producto_id: 'b', nombre: 'Caramelos surtidos', precio_unitario: 900000, cantidad: 0.25, subtotal: 225000 },
    { id: '3', producto_id: 'c', nombre: 'Alfajor triple de chocolate con dulce de leche extra', precio_unitario: 345000, cantidad: 1, subtotal: 345000 },
  ],
  pagos: [{ id: 'p', medio: 'efectivo', monto: 1070000, recibido: 2000000 }],
}

const textos = (columnas: number, v = venta) => armarTicket(v, kiosko, columnas).map((l) => l.texto)

describe('armarTicket', () => {
  it.each([32, 48])('ningún renglón se pasa de %i columnas', (columnas) => {
    for (const texto of textos(columnas)) expect(texto.length).toBeLessThanOrEqual(columnas)
  })

  it('pone total, paga con y vuelto con el monto a la derecha', () => {
    const lineas = textos(32)
    expect(lineas).toContain('TOTAL                $ 10.700,00')
    expect(lineas).toContain('  Paga con           $ 20.000,00')
    expect(lineas).toContain('  Vuelto              $ 9.300,00')
  })

  it('muestra cantidad y precio unitario, y los kilos en los pesables', () => {
    expect(textos(32)).toContain('  2 x $ 2.500,00      $ 5.000,00')
    expect(textos(48)).toContain('  0,25 kg x $ 9.000,00/kg             $ 2.250,00')
  })

  it('si el detalle no deja lugar, el monto baja al renglón siguiente', () => {
    const lineas = textos(32)
    const i = lineas.indexOf('  0,25 kg x $ 9.000,00/kg')
    expect(lineas[i + 1]).toBe('$ 2.250,00'.padStart(32))
  })

  it('no deja renglones vacíos por los datos del negocio que faltan', () => {
    expect(textos(32).slice(0, 3)).toEqual(['KIOSCO LUCHO', 'Av. Siempreviva 742', '-'.repeat(32)])
  })

  it('marca la venta anulada y usa el comienzo del id como número', () => {
    const lineas = textos(32, { ...venta, anulada: true })
    expect(lineas).toContain('*** VENTA ANULADA ***')
    expect(lineas.some((l) => l.endsWith('N° 7F3A91C2'))).toBe(true)
  })
})

describe('partir', () => {
  it('corta por palabras y conserva la sangría', () => {
    expect(partir('  uno dos tres', 9)).toEqual(['  uno dos', '  tres'])
  })

  it('parte una palabra más larga que el renglón', () => {
    expect(partir('abcdefghij', 4)).toEqual(['abcd', 'efgh', 'ij'])
  })
})

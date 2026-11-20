import { describe, expect, it } from 'vitest'
import { codigoCorrecto, hashearCodigo } from './codigoAdmin'
import type { Kiosko } from './modelos'

const KIOSKO: Kiosko = { id: 'kiosko-1', nombre: 'Kiosco', direccion: null, telefono: null, pie_ticket: null, codigo_admin_hash: null }

describe('código de admin', () => {
  it('el hash es SHA-256 del id del kiosko y el código', async () => {
    expect(await hashearCodigo('kiosko-1', '1234')).toBe('2d7bf9b56fbe0a7baf3eba78c547f6059a417ceeee103d49f67e22f9d21bfb8a')
  })

  it('compara contra el hash guardado', async () => {
    const conCodigo = { ...KIOSKO, codigo_admin_hash: await hashearCodigo('kiosko-1', '1234') }
    expect(await codigoCorrecto(conCodigo, '1234')).toBe(true)
    expect(await codigoCorrecto(conCodigo, '4321')).toBe(false)
  })

  it('sin código guardado ningún código es correcto', async () => {
    expect(await codigoCorrecto(KIOSKO, '1234')).toBe(false)
  })
})

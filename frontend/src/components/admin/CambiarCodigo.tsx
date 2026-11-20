import { useState, type FormEvent } from 'react'
import { cambiarDesbloqueo, guardarCodigoAdmin, LARGO_CODIGO } from '../../lib/codigoAdmin'
import { botonPrimario, claseInput } from '../../lib/estilos'
import type { Kiosko } from '../../lib/modelos'
import { Campo } from '../Campos'

const SOLO_DIGITOS = new RegExp(`^\\d{${LARGO_CODIGO}}$`)

export function CambiarCodigo({ kiosko }: { kiosko: Kiosko }) {
  const [codigo, setCodigo] = useState('')
  const [repetido, setRepetido] = useState('')
  const [estado, setEstado] = useState<'editando' | 'guardado' | 'quitado' | 'no-coinciden'>('editando')
  const [error, setError] = useState<string | null>(null)
  const tieneCodigo = kiosko.codigo_admin_hash !== null

  const guardar = async (evento: FormEvent) => {
    evento.preventDefault()
    if (codigo !== repetido) return setEstado('no-coinciden')
    try {
      // Antes de guardar: si no, al aparecer el código se pide en el acto y se pierde esta pantalla.
      cambiarDesbloqueo(true)
      await guardarCodigoAdmin(kiosko, codigo)
      setCodigo('')
      setRepetido('')
      setEstado('guardado')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el código')
    }
  }

  const quitar = async () => {
    if (!confirm('¿Quitar el código? Cualquiera va a poder entrar a Admin, anular ventas y cambiar precios.')) return
    await guardarCodigoAdmin(kiosko, null)
    setEstado('quitado')
  }

  const cambiar = (setter: (valor: string) => void) => (valor: string) => {
    setter(valor.replace(/\D/g, '').slice(0, LARGO_CODIGO))
    setEstado('editando')
    setError(null)
  }

  return (
    <div className="max-w-md space-y-5">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Código de admin</h1>
        <p className="mt-1 text-sm text-tenue">
          {LARGO_CODIGO} números. Se pide para entrar acá, anular una venta y cambiar el precio de un producto. Es un freno para que nadie lo haga sin querer, no una clave segura.
        </p>
      </div>
      <form onSubmit={guardar} className="space-y-4" noValidate>
        <Campo etiqueta={tieneCodigo ? 'Código nuevo' : 'Código'}>
          <input type="password" inputMode="numeric" autoComplete="off" value={codigo} onChange={(e) => cambiar(setCodigo)(e.target.value)} className={claseInput()} />
        </Campo>
        <Campo etiqueta="Repetilo" error={estado === 'no-coinciden' ? 'Los dos códigos no coinciden' : error}>
          <input type="password" inputMode="numeric" autoComplete="off" value={repetido} onChange={(e) => cambiar(setRepetido)(e.target.value)} className={claseInput(estado === 'no-coinciden')} />
        </Campo>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={!SOLO_DIGITOS.test(codigo) || !repetido} className={`${botonPrimario} px-6 py-2.5`}>
            {tieneCodigo ? 'Cambiar código' : 'Poner código'}
          </button>
          {estado === 'guardado' && <span className="text-sm font-semibold text-ok">Guardado</span>}
          {estado === 'quitado' && <span className="text-sm font-semibold text-ok">Código quitado</span>}
        </div>
      </form>
      {tieneCodigo && (
        <button onClick={quitar} className="text-sm text-tenue underline underline-offset-4 hover:text-tinta">
          Quitar el código
        </button>
      )}
    </div>
  )
}

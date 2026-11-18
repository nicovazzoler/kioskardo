import { useState, type FormEvent } from 'react'
import { ErrorApi, pedirApi } from '../lib/api'
import { claseInput } from '../lib/estilos'
import { guardarToken } from '../lib/sesion'
import { sincronizar } from '../lib/sincronizacion'

export function IngresoClave() {
  const [clave, setClave] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const ingresar = async (evento: FormEvent) => {
    evento.preventDefault()
    if (!clave) return
    setEnviando(true)
    try {
      const { token } = await pedirApi<{ token: string }>('/sesion', { method: 'POST', body: JSON.stringify({ clave }) })
      guardarToken(token)
      void sincronizar()
    } catch (e) {
      setError(e instanceof ErrorApi && e.status === 401 ? 'Clave incorrecta' : 'No hay conexión con el servidor')
      setClave('')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-100 p-4">
      <form onSubmit={ingresar} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="" className="h-10 w-10" />
          <div>
            <h1 className="text-xl font-bold">Kioskardo</h1>
            <p className="text-sm text-slate-500">Ingresá la clave del kiosco</p>
          </div>
        </div>
        <input
          type="password"
          autoFocus
          autoComplete="current-password"
          value={clave}
          onChange={(e) => {
            setClave(e.target.value)
            setError(null)
          }}
          aria-label="Clave del kiosco"
          className={claseInput(!!error)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={!clave || enviando} className="w-full rounded-lg bg-marca-700 py-3 font-semibold text-white disabled:opacity-40">
          Entrar
        </button>
        <p className="text-center text-xs text-slate-400">Se pide una sola vez en cada dispositivo.</p>
      </form>
    </div>
  )
}

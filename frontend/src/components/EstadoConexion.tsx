import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { pedirApi } from '../lib/api'
import { db } from '../lib/db'
import { rotulo } from '../lib/estilos'
import { descartarRechazados } from '../lib/sincronizacion'

type Estado = 'verificando' | 'conectado' | 'sin-conexion'

const INTERVALO_MS = 30_000

const ESTILOS: Record<Estado, { color: string; texto: string }> = {
  verificando: { color: 'text-apagado', texto: 'Verificando…' },
  conectado: { color: 'text-ok', texto: 'En línea' },
  'sin-conexion': { color: 'text-error', texto: 'Sin conexión' },
}

// Indicador de conexión con el backend y de cambios que todavía no se subieron.
export function EstadoConexion() {
  const [estado, setEstado] = useState<Estado>('verificando')
  const pendientes = useLiveQuery(() => db.pendientes.toArray(), []) ?? []
  const rechazados = pendientes.filter((p) => p.error)
  const enCola = pendientes.length - rechazados.length

  useEffect(() => {
    const verificar = () =>
      pedirApi<{ ok: boolean }>('/salud')
        .then(() => setEstado('conectado'))
        .catch(() => setEstado('sin-conexion'))

    verificar()
    const intervalo = setInterval(verificar, INTERVALO_MS)
    window.addEventListener('online', verificar)
    window.addEventListener('offline', verificar)
    return () => {
      clearInterval(intervalo)
      window.removeEventListener('online', verificar)
      window.removeEventListener('offline', verificar)
    }
  }, [])

  return (
    <span className={`inline-flex flex-wrap items-center gap-x-3 gap-y-1 ${rotulo}`}>
      {rechazados.length > 0 && (
        <button
          onClick={() => {
            const detalle = rechazados.map((p) => `• ${p.error}`).join('\n')
            if (confirm(`El servidor rechazó ${rechazados.length} cambio(s):\n${detalle}\n\n¿Descartarlos?`)) {
              void descartarRechazados()
            }
          }}
          className="text-error underline underline-offset-4"
        >
          {rechazados.length} con error
        </button>
      )}
      {enCola > 0 && <span className="text-ambar">{enCola} sin subir</span>}
      <span className={ESTILOS[estado].color}>{ESTILOS[estado].texto}</span>
    </span>
  )
}

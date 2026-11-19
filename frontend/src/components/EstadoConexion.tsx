import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { pedirApi } from '../lib/api'
import { db } from '../lib/db'
import { descartarRechazados } from '../lib/sincronizacion'

type Estado = 'verificando' | 'conectado' | 'sin-conexion'

const INTERVALO_MS = 30_000

const ESTILOS: Record<Estado, { punto: string; texto: string }> = {
  verificando: { punto: 'bg-apagado', texto: 'Verificando…' },
  conectado: { punto: 'bg-ok', texto: 'En línea' },
  'sin-conexion': { punto: 'bg-error', texto: 'Sin conexión' },
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
    <span className="inline-flex flex-wrap items-center gap-2 text-sm text-tenue">
      {rechazados.length > 0 && (
        <button
          onClick={() => {
            const detalle = rechazados.map((p) => `• ${p.error}`).join('\n')
            if (confirm(`El servidor rechazó ${rechazados.length} cambio(s):\n${detalle}\n\n¿Descartarlos?`)) {
              void descartarRechazados()
            }
          }}
          className="rounded-full bg-error px-2.5 py-0.5 font-medium text-fondo"
        >
          ⚠ {rechazados.length} con error
        </button>
      )}
      {enCola > 0 && <span className="rounded-full bg-ambar px-2.5 py-0.5 font-medium text-fondo">{enCola} sin subir</span>}
      <span className="inline-flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${ESTILOS[estado].punto}`} />
        {ESTILOS[estado].texto}
      </span>
    </span>
  )
}

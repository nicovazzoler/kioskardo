import { useEffect, useState } from 'react'
import { pedirApi } from '../lib/api'

type Estado = 'verificando' | 'conectado' | 'sin-conexion'

const INTERVALO_MS = 30_000

// Indicador chico que avisa si el backend responde.
export function EstadoConexion() {
  const [estado, setEstado] = useState<Estado>('verificando')

  useEffect(() => {
    const verificar = () =>
      pedirApi<{ ok: boolean }>('/salud')
        .then(() => setEstado('conectado'))
        .catch(() => setEstado('sin-conexion'))

    verificar()
    const intervalo = setInterval(verificar, INTERVALO_MS)
    window.addEventListener('online', verificar)
    window.addEventListener('offline', verificar)
    // La función que devuelve el efecto se ejecuta al desmontar: limpia timers y listeners.
    return () => {
      clearInterval(intervalo)
      window.removeEventListener('online', verificar)
      window.removeEventListener('offline', verificar)
    }
  }, [])

  const estilos: Record<Estado, { punto: string; texto: string }> = {
    verificando: { punto: 'bg-slate-400', texto: 'Verificando…' },
    conectado: { punto: 'bg-emerald-500', texto: 'En línea' },
    'sin-conexion': { punto: 'bg-red-500', texto: 'Sin conexión' },
  }

  return (
    <span className="inline-flex items-center gap-2 text-sm text-slate-600">
      <span className={`h-2.5 w-2.5 rounded-full ${estilos[estado].punto}`} />
      {estilos[estado].texto}
    </span>
  )
}

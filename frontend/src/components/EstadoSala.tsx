import type { EstadoVivo } from '../lib/vivo'

export function EstadoSala({ estado, cajas }: { estado: EstadoVivo; cajas: number }) {
  const [color, texto] =
    estado === 'conectando'
      ? ['bg-ambar', 'Conectando…']
      : estado === 'sin-conexion'
        ? ['bg-error', 'Sin conexión']
        : cajas === 0
          ? ['bg-ambar', 'Esperando a la caja']
          : ['bg-ok', 'Conectado a la caja']

  return (
    <span className="flex items-center gap-2 text-sm text-tenue">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${color}`} />
      {texto}
    </span>
  )
}

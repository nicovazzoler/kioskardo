import { rotulo } from '../lib/estilos'
import type { EstadoVivo } from '../lib/vivo'

export function EstadoSala({ estado, cajas }: { estado: EstadoVivo; cajas: number }) {
  const [color, texto] =
    estado === 'conectando'
      ? ['text-ambar', 'Conectando…']
      : estado === 'sin-conexion'
        ? ['text-error', 'Sin conexión']
        : cajas === 0
          ? ['text-ambar', 'Esperando a la caja']
          : ['text-ok', 'Conectado a la caja']

  return <span className={`${rotulo} ${color}`}>{texto}</span>
}

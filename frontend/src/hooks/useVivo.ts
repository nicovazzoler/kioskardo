import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react'
import { useNecesitaClave } from '../lib/sesion'
import { conectarVivo, type ConexionVivo, type EstadoVivo, type MensajeCliente, type MensajeServidor, type Rol } from '../lib/vivo'

// Mientras falta la clave no conecta: al ingresarla, el efecto se vuelve a correr y conecta al toque.
export function useVivo(rol: Rol, alRecibir?: (mensaje: MensajeServidor) => void) {
  const necesitaClave = useNecesitaClave()
  const [estado, setEstado] = useState<EstadoVivo>('conectando')
  const [cajas, setCajas] = useState(0)
  const conexion = useRef<ConexionVivo | null>(null)

  const recibido = useEffectEvent((mensaje: MensajeServidor) => {
    if (mensaje.tipo === 'cajas') setCajas(mensaje.conectadas)
    alRecibir?.(mensaje)
  })

  useEffect(() => {
    if (necesitaClave) return
    const nueva = conectarVivo({ rol, alRecibir: (mensaje) => recibido(mensaje), alCambiarEstado: setEstado })
    conexion.current = nueva
    return () => {
      nueva.cerrar()
      conexion.current = null
    }
  }, [rol, necesitaClave])

  const enviar = useCallback((mensaje: MensajeCliente) => conexion.current?.enviar(mensaje) ?? false, [])

  return { estado, cajas, enviar }
}

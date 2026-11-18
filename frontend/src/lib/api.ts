import { leerToken, pedirClave } from './sesion'

export class ErrorApi extends Error {
  readonly status: number

  constructor(status: number, mensaje: string) {
    super(mensaje)
    this.status = status
  }
}

// En desarrollo, Vite redirige /api al backend (ver proxy en vite.config.ts).
export async function pedirApi<T>(ruta: string, opciones?: RequestInit): Promise<T> {
  const token = leerToken()
  const respuesta = await fetch(`/api${ruta}`, {
    ...opciones,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }), ...opciones?.headers },
  })
  if (respuesta.status === 401) pedirClave()
  if (!respuesta.ok) {
    throw new ErrorApi(respuesta.status, await respuesta.text())
  }
  return respuesta.json() as Promise<T>
}

import { useSyncExternalStore } from 'react'

const CLAVE = 'kioskardo:token'

let necesitaClave = false
const oyentes = new Set<() => void>()

export function leerToken(): string | null {
  try {
    return localStorage.getItem(CLAVE)
  } catch {
    return null
  }
}

export function guardarToken(token: string) {
  try {
    localStorage.setItem(CLAVE, token)
  } catch {
    // Sin almacenamiento la sesión dura hasta recargar la página.
  }
  avisar(false)
}

// La llama la API cuando el servidor contesta 401: la pantalla muestra el ingreso de la clave.
export function pedirClave() {
  avisar(true)
}

export function useNecesitaClave(): boolean {
  return useSyncExternalStore(
    (oyente) => {
      oyentes.add(oyente)
      return () => oyentes.delete(oyente)
    },
    () => necesitaClave,
  )
}

function avisar(valor: boolean) {
  necesitaClave = valor
  oyentes.forEach((oyente) => oyente())
}

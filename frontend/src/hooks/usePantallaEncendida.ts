import { useEffect } from 'react'

// Evita que la pantalla se apague sola. Necesita https; si el navegador no lo permite, no pasa nada.
export function usePantallaEncendida(activo = true) {
  useEffect(() => {
    if (!activo || !('wakeLock' in navigator)) return
    let candado: WakeLockSentinel | undefined
    let cancelado = false

    const pedir = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        const nuevo = await navigator.wakeLock.request('screen')
        if (cancelado) void nuevo.release()
        else candado = nuevo
      } catch {
        // Lo niega, por ejemplo, con el ahorro de batería activado.
      }
    }

    void pedir()
    // El navegador lo suelta solo cuando la app pasa a segundo plano: se pide de nuevo al volver.
    document.addEventListener('visibilitychange', pedir)
    return () => {
      cancelado = true
      document.removeEventListener('visibilitychange', pedir)
      void candado?.release()
    }
  }, [activo])
}

import { useEffect, useEffectEvent } from 'react'

// Una pistola lectora se comporta como un teclado que tipea muy rápido y termina con Enter.
// Un humano no baja de ~80ms entre teclas; la pistola anda por 5-30ms.
const MAX_MS_ENTRE_TECLAS = 50
const LARGO_MINIMO = 3

// Detecta escaneos cuando el foco NO está en un campo de texto.
// Si hay un input enfocado, la pistola escribe ahí y ese input maneja su propio Enter.
export function useEscaner(alEscanear: (codigo: string) => void, activo = true) {
  // useEffectEvent: el efecto siempre llama a la versión más nueva del callback sin tener que reiniciarse.
  const escaneado = useEffectEvent(alEscanear)

  useEffect(() => {
    if (!activo) return
    let buffer = ''
    let ultimaTecla = 0

    const alPresionar = (evento: KeyboardEvent) => {
      const objetivo = evento.target as HTMLElement
      if (objetivo.closest('input, textarea, select, [contenteditable]')) return
      if (evento.ctrlKey || evento.altKey || evento.metaKey) return

      const ahora = performance.now()
      if (ahora - ultimaTecla > MAX_MS_ENTRE_TECLAS) buffer = ''
      ultimaTecla = ahora

      if (evento.key === 'Enter') {
        if (buffer.length >= LARGO_MINIMO) {
          evento.preventDefault()
          escaneado(buffer)
        }
        buffer = ''
      } else if (evento.key.length === 1) {
        buffer += evento.key
      }
    }

    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [activo])
}

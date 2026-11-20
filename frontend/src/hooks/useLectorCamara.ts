import { useEffect, useEffectEvent, useRef, useState } from 'react'

const FORMATOS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39']
const INTERVALO_MS = 150

// Usa el detector nativo de Chrome (Android). Requiere https o localhost: en http no hay cámara.
// alLeer se llama en cada cuadro con los códigos que se ven, aunque sean los mismos que antes.
export function useLectorCamara(activa: boolean, alLeer: (codigos: string[]) => void) {
  const video = useRef<HTMLVideoElement>(null)
  const leidos = useEffectEvent(alLeer)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!activa) return
    let stream: MediaStream | undefined
    let intervalo: ReturnType<typeof setInterval> | undefined
    let cancelado = false

    const iniciar = async () => {
      try {
        const abierto = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        // Si se desmontó mientras el navegador pedía permiso, la cámara quedaría prendida.
        if (cancelado || !video.current) return abierto.getTracks().forEach((track) => track.stop())
        stream = abierto
        video.current.srcObject = stream
        await video.current.play()

        const detector = new BarcodeDetector({ formats: FORMATOS })
        intervalo = setInterval(async () => {
          if (!video.current || video.current.readyState < 2) return
          try {
            const codigos = await detector.detect(video.current)
            if (!cancelado) leidos(codigos.map((codigo) => codigo.rawValue))
          } catch {
            // Un cuadro que no se pudo analizar: se prueba con el siguiente.
          }
        }, INTERVALO_MS)
      } catch {
        if (!cancelado) setError('No se pudo abrir la cámara. Revisá los permisos del navegador.')
      }
    }

    void iniciar()
    return () => {
      cancelado = true
      clearInterval(intervalo)
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [activa])

  return { video, error }
}

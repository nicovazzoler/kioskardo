import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { Modal } from './Modal'

const FORMATOS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39']
const INTERVALO_MS = 150

interface Props {
  alDetectar: (codigo: string) => void
  alCerrar: () => void
}

// Escanea con la cámara usando el detector nativo de Chrome (disponible en Android).
// Requiere https o localhost: el navegador no da acceso a la cámara en http.
export function EscanerCamara({ alDetectar, alCerrar }: Props) {
  const video = useRef<HTMLVideoElement>(null)
  // Así la cámara no se reinicia cada vez que el padre redibuja y pasa otra función.
  const detectado = useEffectEvent(alDetectar)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let stream: MediaStream | undefined
    let intervalo: ReturnType<typeof setInterval> | undefined
    let cancelado = false

    const iniciar = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (cancelado || !video.current) return
        video.current.srcObject = stream
        await video.current.play()

        const detector = new BarcodeDetector({ formats: FORMATOS })
        intervalo = setInterval(async () => {
          if (!video.current || video.current.readyState < 2) return
          const [codigo] = await detector.detect(video.current)
          if (codigo && !cancelado) {
            cancelado = true
            navigator.vibrate?.(80)
            detectado(codigo.rawValue)
          }
        }, INTERVALO_MS)
      } catch {
        setError('No se pudo abrir la cámara. Revisá los permisos del navegador.')
      }
    }

    void iniciar()
    return () => {
      cancelado = true
      clearInterval(intervalo)
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  return (
    <Modal titulo="Escanear código" alCerrar={alCerrar}>
      {error ? (
        <p className="text-red-600">{error}</p>
      ) : (
        <div className="relative overflow-hidden rounded-xl bg-black">
          <video ref={video} className="aspect-[4/3] w-full object-cover" muted playsInline />
          <div className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 bg-red-500/80" />
        </div>
      )}
      <p className="mt-3 text-center text-sm text-slate-500">Apuntá al código de barras</p>
    </Modal>
  )
}

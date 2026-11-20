import { useRef } from 'react'
import { useLectorCamara } from '../hooks/useLectorCamara'
import { Modal } from './Modal'
import { VisorCamara } from './VisorCamara'

interface Props {
  alDetectar: (codigo: string) => void
  alCerrar: () => void
}

// Lee un solo código y avisa: el que lo abre decide si lo cierra.
export function EscanerCamara({ alDetectar, alCerrar }: Props) {
  const detectado = useRef(false)
  const { video, error } = useLectorCamara(true, ([codigo]) => {
    if (!codigo || detectado.current) return
    detectado.current = true
    navigator.vibrate?.(80)
    alDetectar(codigo)
  })

  return (
    <Modal titulo="Escanear código" alCerrar={alCerrar}>
      <VisorCamara video={video} error={error} />
      <p className="mt-3 text-center text-sm text-tenue">Apuntá al código de barras</p>
    </Modal>
  )
}

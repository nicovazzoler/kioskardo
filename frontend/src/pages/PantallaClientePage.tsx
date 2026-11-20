import { useEffect, useRef, useState } from 'react'
import { EstadoSala } from '../components/EstadoSala'
import { usePantallaEncendida } from '../hooks/usePantallaEncendida'
import { useVivo } from '../hooks/useVivo'
import { formatearPesosCorto } from '../lib/dinero'
import { botonSecundario } from '../lib/estilos'
import { useKiosko } from '../lib/kiosko'
import type { VentaEnVivo } from '../lib/vivo'

const SALUDO_DESPUES_DE_MS = 20_000

// Lo que ve el cliente en otro dispositivo: la venta que arma la caja, en vivo.
export function PantallaClientePage() {
  const kiosko = useKiosko()
  const [venta, setVenta] = useState<VentaEnVivo | null>(null)
  const [graciasVencidas, setGraciasVencidas] = useState<string | null>(null)
  const { estado, cajas } = useVivo('pantalla', (mensaje) => {
    if (mensaje.tipo === 'venta') setVenta(mensaje.venta)
    if (mensaje.tipo === 'cajas' && mensaje.conectadas === 0) setVenta(null)
  })
  usePantallaEncendida()

  const cobrada = venta && venta.items.length === 0 ? venta.cobrada : null
  const idCobrada = cobrada?.id

  // Por id y no por objeto: la caja reenvía el mismo estado y eso no tiene que reiniciar la espera.
  useEffect(() => {
    if (!idCobrada) return
    const espera = setTimeout(() => setGraciasVencidas(idCobrada), SALUDO_DESPUES_DE_MS)
    return () => clearTimeout(espera)
  }, [idCobrada])

  return (
    <div className="flex h-full flex-col bg-fondo text-tinta">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-6 py-5 md:px-10">
        <span className="flex min-w-0 items-center gap-3">
          <img src="/logo.svg" alt="" className="h-10 w-10 shrink-0" />
          <span className="truncate font-display text-2xl font-semibold md:text-3xl">{kiosko?.nombre ?? 'Kioskardo'}</span>
        </span>
        <span className="flex shrink-0 items-center gap-4">
          <EstadoSala estado={estado} cajas={cajas} />
          <BotonPantallaCompleta />
        </span>
      </header>

      {venta && venta.items.length > 0 ? (
        <VentaEnCurso venta={venta} />
      ) : cobrada && cobrada.id !== graciasVencidas ? (
        <Gracias total={cobrada.total} vuelto={cobrada.vuelto} />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="font-display text-6xl font-semibold md:text-7xl">¡Hola!</p>
          <p className="text-2xl text-tenue">Esperando la próxima venta…</p>
        </div>
      )}
    </div>
  )
}

function VentaEnCurso({ venta }: { venta: VentaEnVivo }) {
  const lista = useRef<HTMLUListElement>(null)
  const vuelto = venta.recibido !== null && venta.recibido >= venta.total ? venta.recibido - venta.total : null

  // El último producto que se agrega queda abajo: la lista baja sola para que se vea.
  useEffect(() => {
    lista.current?.scrollTo({ top: lista.current.scrollHeight, behavior: 'smooth' })
  }, [venta.items.length])

  return (
    <>
      <ul ref={lista} className="min-h-0 flex-1 divide-y divide-linea overflow-y-auto px-6 md:px-10">
        {venta.items.map((linea) => (
          <li key={linea.id} className="flex items-center gap-3 py-4 md:gap-4">
            <span className="w-16 shrink-0 rounded-xl bg-elevado px-2 py-2 text-center font-bold tabular-nums md:w-20 md:text-xl">{linea.cantidad}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xl font-semibold md:text-3xl">{linea.nombre}</p>
              <p className="text-tenue md:text-lg">{linea.detalle}</p>
            </div>
            <span className="shrink-0 font-display text-xl font-semibold tabular-nums md:text-3xl">{formatearPesosCorto(linea.subtotal)}</span>
          </li>
        ))}
      </ul>
      <footer className="space-y-4 bg-panel px-6 py-6 md:px-10 md:py-8">
        {vuelto !== null && (
          <div className="flex flex-wrap items-baseline justify-between gap-2 text-2xl">
            <span className="text-tenue">Paga con {formatearPesosCorto(venta.recibido!)}</span>
            <span>
              Vuelto <strong className="font-display text-4xl text-salvia tabular-nums">{formatearPesosCorto(vuelto)}</strong>
            </span>
          </div>
        )}
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-3xl text-tenue">Total</span>
          <span className="font-display text-6xl font-semibold tabular-nums md:text-8xl">{formatearPesosCorto(venta.total)}</span>
        </div>
      </footer>
    </>
  )
}

function Gracias({ total, vuelto }: { total: number; vuelto: number }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
      <p className="font-display text-6xl font-semibold md:text-7xl">¡Gracias!</p>
      <p className="text-3xl text-tinta-suave">Total {formatearPesosCorto(total)}</p>
      {vuelto > 0 && (
        <p className="rounded-3xl bg-salvia px-8 py-4 text-3xl text-fondo">
          Tu vuelto <strong className="font-display text-5xl tabular-nums">{formatearPesosCorto(vuelto)}</strong>
        </p>
      )}
    </div>
  )
}

// El navegador solo deja pasar a pantalla completa después de un toque: no se puede hacer solo.
function BotonPantallaCompleta() {
  const [completa, setCompleta] = useState(() => document.fullscreenElement !== null)

  useEffect(() => {
    const actualizar = () => setCompleta(document.fullscreenElement !== null)
    document.addEventListener('fullscreenchange', actualizar)
    return () => document.removeEventListener('fullscreenchange', actualizar)
  }, [])

  if (completa || !document.fullscreenEnabled) return null
  return (
    <button onClick={() => void document.documentElement.requestFullscreen().catch(() => {})} className={`${botonSecundario} px-3 py-2 text-sm`}>
      Pantalla completa
    </button>
  )
}

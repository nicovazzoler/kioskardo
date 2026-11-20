import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { EstadoSala } from '../components/EstadoSala'
import { IconoCamara } from '../components/Iconos'
import { VisorCamara } from '../components/VisorCamara'
import { useLectorCamara } from '../hooks/useLectorCamara'
import { usePantallaEncendida } from '../hooks/usePantallaEncendida'
import { useVivo } from '../hooks/useVivo'
import { camaraDisponible } from '../lib/camara'
import { formatearPesosCorto } from '../lib/dinero'
import { buscarPorCodigo } from '../lib/productos'
import { crearFiltroDeRepetidos } from '../lib/repetidos'
import type { VentaEnVivo } from '../lib/vivo'

// Sin leer nada en este tiempo la cámara se apaga sola: deja el celu en el mostrador sin gastar batería.
const APAGAR_SIN_USO_MS = 60_000

interface Aviso {
  ok: boolean
  texto: string
}

// El celu como lector de la caja: lo que escanea se suma a la venta de la tablet.
export function EscanerPage() {
  const [venta, setVenta] = useState<VentaEnVivo | null>(null)
  const [activa, setActiva] = useState(false)
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const [esLecturaNueva] = useState(() => crearFiltroDeRepetidos())
  const ultimaLectura = useRef(0)
  const { estado, cajas, enviar } = useVivo('escaner', (mensaje) => {
    if (mensaje.tipo === 'venta') setVenta(mensaje.venta)
    if (mensaje.tipo === 'cajas' && mensaje.conectadas === 0) setVenta(null)
  })
  usePantallaEncendida(activa)

  const mandar = async (codigo: string) => {
    if (estado !== 'conectada' || cajas === 0 || !enviar({ tipo: 'codigo', codigo })) {
      navigator.vibrate?.([60, 60, 60])
      setAviso({ ok: false, texto: 'No se envió: la caja no está conectada' })
      return
    }
    navigator.vibrate?.(80)
    const producto = await buscarPorCodigo(codigo)
    setAviso({ ok: true, texto: producto?.nombre ?? `Código ${codigo} (no está cargado)` })
  }

  const { video, error } = useLectorCamara(activa, (codigos) => {
    const ahora = Date.now()
    if (codigos.length > 0) ultimaLectura.current = ahora
    else if (ahora - ultimaLectura.current > APAGAR_SIN_USO_MS) setActiva(false)
    for (const codigo of codigos) if (esLecturaNueva(codigo, ahora)) void mandar(codigo)
  })

  const prender = () => {
    ultimaLectura.current = Date.now()
    setActiva(true)
  }

  return (
    <div className="flex h-full flex-col bg-fondo text-tinta">
      <header className="flex items-center justify-between gap-3 border-b border-linea px-4 py-3">
        <Link to="/" className="text-sm text-tinta-suave">
          ← Volver
        </Link>
        <span className="font-display text-lg font-semibold">Escáner</span>
        <EstadoSala estado={estado} cajas={cajas} />
      </header>

      <div className="space-y-3 p-4">
        {!camaraDisponible ? (
          <p className="rounded-xl bg-ambar/10 px-4 py-3 text-ambar">Este navegador no puede leer códigos con la cámara. Usá Chrome en Android.</p>
        ) : activa ? (
          <>
            <VisorCamara video={video} error={error} />
            <button onClick={() => setActiva(false)} className="w-full text-sm text-tinta-suave underline">
              Apagar la cámara
            </button>
          </>
        ) : (
          <button
            onClick={prender}
            className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-borde text-tinta-suave"
          >
            <IconoCamara tamano={40} />
            <span className="text-lg font-semibold">Tocá para escanear</span>
          </button>
        )}
        {aviso && (
          <p className={`rounded-xl px-4 py-3 font-semibold ${aviso.ok ? 'bg-ok/15 text-ok' : 'bg-error/15 text-error'}`}>
            {aviso.ok ? '✓ ' : ''}
            {aviso.texto}
          </p>
        )}
      </div>

      <section className="min-h-0 flex-1 overflow-y-auto border-t border-linea bg-panel p-4">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="font-semibold">Venta en la caja</h2>
          <span className="font-display text-2xl font-semibold tabular-nums">{formatearPesosCorto(venta?.total ?? 0)}</span>
        </div>
        {venta && venta.items.length > 0 ? (
          <ul className="divide-y divide-linea">
            {/* Lo último escaneado arriba: es lo que se quiere confirmar. */}
            {venta.items.toReversed().map((linea) => (
              <li key={linea.id} className="flex items-baseline gap-3 py-2">
                <span className="w-12 shrink-0 text-sm font-bold text-tenue tabular-nums">{linea.cantidad}</span>
                <span className="min-w-0 flex-1 truncate">{linea.nombre}</span>
                <span className="shrink-0 font-semibold tabular-nums">{formatearPesosCorto(linea.subtotal)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-tenue">Todavía no hay productos.</p>
        )}
      </section>
    </div>
  )
}

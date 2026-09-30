import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { EscanerCamara } from '../components/EscanerCamara'
import { FormularioProducto } from '../components/inventario/FormularioProducto'
import { AbrirCaja } from '../components/venta/AbrirCaja'
import { ModalCobro } from '../components/venta/ModalCobro'
import { ModalPeso } from '../components/venta/ModalPeso'
import { ModalVarios } from '../components/venta/ModalVarios'
import { useCarrito, type ItemCarrito } from '../hooks/useCarrito'
import { useEscaner } from '../hooks/useEscaner'
import { useCajaAbierta } from '../lib/cajas'
import { camaraDisponible } from '../lib/camara'
import { formatearCantidad } from '../lib/cantidad'
import { db } from '../lib/db'
import { formatearPesos } from '../lib/dinero'
import type { Producto, VentaPago } from '../lib/modelos'
import { buscarPorCodigo } from '../lib/productos'
import { normalizar, pareceCodigoDeBarras } from '../lib/texto'
import { registrarVenta } from '../lib/ventas'

type ModalAbierto =
  | { tipo: 'peso'; producto: Producto }
  | { tipo: 'varios' }
  | { tipo: 'cobro' }
  | { tipo: 'crear'; codigo: string }
  | { tipo: 'camara' }

const MAX_RESULTADOS = 6

// En PC/tablet con pistola conviene que el buscador tenga siempre el foco.
// En el celular no: abriría el teclado en pantalla a cada rato.
const tienePunteroFino = window.matchMedia('(pointer: fine)').matches

export function VentaPage() {
  const caja = useCajaAbierta()

  if (caja === undefined) return null
  if (caja === null) return <AbrirCaja />
  return <PuntoDeVenta cajaId={caja.id} />
}

function PuntoDeVenta({ cajaId }: { cajaId: string }) {
  const carrito = useCarrito()
  const productos = useLiveQuery(() => db.productos.filter((p) => p.activo).toArray(), [])
  const [busqueda, setBusqueda] = useState('')
  const [modal, setModal] = useState<ModalAbierto | null>(null)
  const [codigoDesconocido, setCodigoDesconocido] = useState<string | null>(null)
  const [ultimaVenta, setUltimaVenta] = useState<{ total: number; vuelto: number } | null>(null)
  const inputBusqueda = useRef<HTMLInputElement>(null)

  const resultados = useMemo(() => {
    const termino = normalizar(busqueda)
    if (!termino || pareceCodigoDeBarras(busqueda)) return []
    return (productos ?? []).filter((p) => normalizar(p.nombre).includes(termino)).slice(0, MAX_RESULTADOS)
  }, [productos, busqueda])

  const enfocarBusqueda = () => {
    if (tienePunteroFino) setTimeout(() => inputBusqueda.current?.focus())
  }

  const cerrarModal = () => {
    setModal(null)
    enfocarBusqueda()
  }

  const agregar = (producto: Producto) => {
    setBusqueda('')
    setCodigoDesconocido(null)
    setUltimaVenta(null)
    if (producto.unidad === 'kg') setModal({ tipo: 'peso', producto })
    else carrito.agregarProducto(producto)
  }

  const procesarCodigo = async (codigo: string) => {
    const producto = await buscarPorCodigo(codigo)
    if (producto) return agregar(producto)
    setBusqueda('')
    setCodigoDesconocido(codigo)
    navigator.vibrate?.([60, 60, 60])
  }

  useEscaner(procesarCodigo, modal === null)

  const alPresionarEnBusqueda = (evento: KeyboardEvent<HTMLInputElement>) => {
    if (evento.key !== 'Enter') return
    evento.preventDefault()
    const texto = busqueda.trim()
    if (!texto && carrito.items.length > 0) setModal({ tipo: 'cobro' })
    else if (pareceCodigoDeBarras(texto)) void procesarCodigo(texto)
    else if (resultados.length > 0) agregar(resultados[0])
  }

  const cobrar = async (pagos: VentaPago[]) => {
    const items = carrito.items.map(({ unidad: _unidad, ...item }) => item)
    const venta = await registrarVenta(cajaId, items, pagos)
    const efectivo = pagos.find((p) => p.recibido !== null)
    setUltimaVenta({ total: venta.total, vuelto: efectivo ? efectivo.recibido! - efectivo.monto : 0 })
    carrito.vaciar()
    cerrarModal()
  }

  const cantidadArticulos = carrito.items.reduce((suma, i) => suma + (i.unidad === 'kg' ? 1 : i.cantidad), 0)
  const hayItems = carrito.items.length > 0

  return (
    <div className="flex h-full flex-col md:flex-row">
      <div className="flex min-h-0 flex-1 flex-col p-4 md:p-6">
        <div className="relative">
          <div className="flex gap-2">
            <input
              ref={inputBusqueda}
              type="search"
              autoFocus={tienePunteroFino}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={alPresionarEnBusqueda}
              placeholder="Escaneá o buscá un producto…"
              className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-4 py-3 text-base"
            />
            {camaraDisponible && (
              <button onClick={() => setModal({ tipo: 'camara' })} className="rounded-lg border border-slate-300 bg-white px-4 text-xl" aria-label="Escanear con cámara">
                📷
              </button>
            )}
          </div>
          {resultados.length > 0 && (
            <ul className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-slate-200">
              {resultados.map((producto, indice) => (
                <li key={producto.id}>
                  <button
                    onClick={() => agregar(producto)}
                    className={`flex w-full justify-between px-4 py-3 text-left hover:bg-slate-50 ${indice === 0 ? 'bg-slate-50' : ''}`}
                  >
                    <span className="truncate">{producto.nombre}</span>
                    <span className="ml-3 shrink-0 font-semibold tabular-nums">{formatearPesos(producto.precio_venta)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {codigoDesconocido && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-red-50 px-4 py-3 text-red-800">
            <span>
              No existe el código <strong className="font-mono">{codigoDesconocido}</strong>
            </span>
            <button onClick={() => setModal({ tipo: 'crear', codigo: codigoDesconocido })} className="shrink-0 rounded-md bg-red-700 px-3 py-1.5 text-sm font-medium text-white">
              Crear producto
            </button>
          </div>
        )}

        {ultimaVenta && !hayItems && (
          <div className="mt-3 flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-3 text-emerald-900">
            <span>✓ Venta de {formatearPesos(ultimaVenta.total)}</span>
            {ultimaVenta.vuelto > 0 && (
              <span className="text-lg">
                Vuelto: <strong className="tabular-nums">{formatearPesos(ultimaVenta.vuelto)}</strong>
              </span>
            )}
          </div>
        )}

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
          {hayItems ? (
            <ul className="divide-y divide-slate-100 rounded-xl bg-white ring-1 ring-slate-200">
              {carrito.items.map((item) => (
                <LineaCarrito key={item.id} item={item} alCambiarCantidad={carrito.cambiarCantidad} alQuitar={carrito.quitar} />
              ))}
            </ul>
          ) : (
            <div className="flex h-full min-h-40 flex-col items-center justify-center text-center text-slate-400">
              <span className="text-5xl">🛒</span>
              <p className="mt-2">Escaneá un producto o buscalo por nombre</p>
            </div>
          )}
        </div>
      </div>

      <aside className="flex shrink-0 items-center gap-3 border-t border-slate-200 bg-white p-4 md:w-80 md:flex-col md:items-stretch md:border-t-0 md:border-l md:p-6">
        <div className="flex-1 md:flex-none">
          <p className="text-sm text-slate-500">
            Total{hayItems && ` · ${cantidadArticulos} ${cantidadArticulos === 1 ? 'artículo' : 'artículos'}`}
          </p>
          <p className="text-3xl font-bold tabular-nums md:text-5xl">{formatearPesos(carrito.total)}</p>
        </div>
        <button
          onClick={() => setModal({ tipo: 'varios' })}
          className="rounded-lg border border-slate-300 px-3 py-3 font-medium text-slate-700 md:order-last md:py-2.5"
        >
          Varios $
        </button>
        <button
          onClick={() => setModal({ tipo: 'cobro' })}
          disabled={!hayItems}
          className="rounded-lg bg-marca-700 px-6 py-3 text-lg font-semibold text-white hover:bg-marca-800 disabled:opacity-40 md:py-4 md:text-xl"
        >
          Cobrar
        </button>
        {hayItems && (
          <button
            onClick={() => confirm('¿Vaciar el carrito?') && carrito.vaciar()}
            className="hidden text-sm text-slate-500 underline md:order-last md:block"
          >
            Vaciar carrito
          </button>
        )}
        {tienePunteroFino && <p className="hidden text-center text-xs text-slate-400 md:mt-auto md:block">Enter con el buscador vacío = Cobrar</p>}
      </aside>

      {modal?.tipo === 'peso' && (
        <ModalPeso
          producto={modal.producto}
          alCerrar={cerrarModal}
          alConfirmar={(cantidad, subtotal) => {
            carrito.agregarPesado(modal.producto, cantidad, subtotal)
            cerrarModal()
          }}
        />
      )}
      {modal?.tipo === 'varios' && (
        <ModalVarios
          alCerrar={cerrarModal}
          alConfirmar={(monto, descripcion) => {
            setUltimaVenta(null)
            carrito.agregarVarios(monto, descripcion)
            cerrarModal()
          }}
        />
      )}
      {modal?.tipo === 'cobro' && <ModalCobro total={carrito.total} alCerrar={cerrarModal} alConfirmar={cobrar} />}
      {modal?.tipo === 'crear' && (
        <FormularioProducto
          codigoInicial={modal.codigo}
          alCerrar={cerrarModal}
          alCrear={async (id) => {
            const producto = await db.productos.get(id)
            if (producto) agregar(producto)
          }}
        />
      )}
      {modal?.tipo === 'camara' && (
        <EscanerCamara
          alCerrar={cerrarModal}
          alDetectar={(codigo) => {
            setModal(null)
            void procesarCodigo(codigo)
          }}
        />
      )}
    </div>
  )
}

interface LineaProps {
  item: ItemCarrito
  alCambiarCantidad: (id: string, cantidad: number) => void
  alQuitar: (id: string) => void
}

function LineaCarrito({ item, alCambiarCantidad, alQuitar }: LineaProps) {
  return (
    <li className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 px-4 py-3 md:grid-cols-[1fr_auto_7rem_auto]">
      <div className="min-w-0">
        <p className="truncate font-medium">{item.nombre}</p>
        <p className="text-sm text-slate-500 tabular-nums">
          {formatearPesos(item.precio_unitario)}
          {item.unidad === 'kg' && ' /kg'}
        </p>
      </div>

      {item.unidad === 'kg' ? (
        <span className="justify-self-end text-slate-600 tabular-nums">{formatearCantidad(item.cantidad, 'kg')}</span>
      ) : (
        <div className="flex items-center justify-self-end rounded-lg ring-1 ring-slate-200">
          <button onClick={() => alCambiarCantidad(item.id, item.cantidad - 1)} className="h-10 w-10 text-xl text-slate-600" aria-label="Uno menos">
            −
          </button>
          <span className="w-8 text-center font-semibold tabular-nums">{item.cantidad}</span>
          <button onClick={() => alCambiarCantidad(item.id, item.cantidad + 1)} className="h-10 w-10 text-xl text-slate-600" aria-label="Uno más">
            +
          </button>
        </div>
      )}

      <span className="text-lg font-semibold tabular-nums md:text-right">{formatearPesos(item.subtotal)}</span>
      <button onClick={() => alQuitar(item.id)} className="justify-self-end rounded-lg p-2 text-xl leading-none text-slate-400 hover:bg-slate-100 hover:text-red-600" aria-label="Quitar">
        ×
      </button>
    </li>
  )
}

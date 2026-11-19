import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { EscanerCamara } from '../components/EscanerCamara'
import { IconoBuscar, IconoCamara, IconoRecibo } from '../components/Iconos'
import { ICONOS_CATEGORIA } from '../components/iconosPorTipo'
import { FormularioProducto } from '../components/inventario/FormularioProducto'
import { ModalTicket } from '../components/ticket/ModalTicket'
import { AbrirCaja } from '../components/venta/AbrirCaja'
import { ModalDosMedios } from '../components/venta/ModalDosMedios'
import { ModalMonto } from '../components/venta/ModalMonto'
import { ModalPeso } from '../components/venta/ModalPeso'
import { ModalVarios } from '../components/venta/ModalVarios'
import { PanelVenta } from '../components/venta/PanelVenta'
import { Modal } from '../components/Modal'
import { useCarrito, type ItemCarrito } from '../hooks/useCarrito'
import { useEscaner } from '../hooks/useEscaner'
import { useCajaAbierta } from '../lib/cajas'
import { camaraDisponible } from '../lib/camara'
import { formatearCantidad } from '../lib/cantidad'
import { CATEGORIAS, datosCategoria } from '../lib/categorias'
import { db } from '../lib/db'
import { formatearPesosCorto } from '../lib/dinero'
import { botonPrimario, botonSecundario } from '../lib/estilos'
import type { Categoria, MedioPago, Producto, Venta, VentaPago } from '../lib/modelos'
import { buscarPorCodigo } from '../lib/productos'
import { normalizar, pareceCodigoDeBarras } from '../lib/texto'
import { nuevoId } from '../lib/uuid'
import { registrarVenta } from '../lib/ventas'

type ModalAbierto =
  | { tipo: 'peso'; producto: Producto }
  | { tipo: 'monto'; producto: Producto }
  | { tipo: 'varios' }
  | { tipo: 'dos-medios' }
  | { tipo: 'crear'; codigo: string }
  | { tipo: 'camara' }
  | { tipo: 'ticket'; venta: Venta }
  | { tipo: 'hoja' }

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
  const [categoria, setCategoria] = useState<Categoria | null>(null)
  const [modal, setModal] = useState<ModalAbierto | null>(null)
  const [codigoDesconocido, setCodigoDesconocido] = useState<string | null>(null)
  const [ultimaVenta, setUltimaVenta] = useState<{ venta: Venta; vuelto: number } | null>(null)
  const [medio, setMedio] = useState<MedioPago>('efectivo')
  // Se guarda junto al total para el que se eligió: si después cambia la venta, deja de valer solo.
  const [pagaCon, setPagaCon] = useState<{ total: number; monto: number } | null>(null)
  const inputBusqueda = useRef<HTMLInputElement>(null)

  const recibido = pagaCon?.total === carrito.total ? pagaCon.monto : null
  const hayItems = carrito.items.length > 0

  // La búsqueda recorre todo el catálogo: la categoría elegida no la limita.
  const resultados = useMemo(() => {
    const termino = normalizar(busqueda)
    if (!termino || pareceCodigoDeBarras(busqueda)) return []
    return (productos ?? []).filter((p) => normalizar(p.nombre).includes(termino)).slice(0, MAX_RESULTADOS)
  }, [productos, busqueda])

  const visibles = useMemo(
    () => (productos ?? []).filter((p) => categoria === null || p.categoria === categoria).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [productos, categoria],
  )

  const cantidadPorCategoria = useMemo(() => {
    const conteo = new Map<Categoria, number>()
    for (const p of productos ?? []) if (p.categoria) conteo.set(p.categoria, (conteo.get(p.categoria) ?? 0) + 1)
    return conteo
  }, [productos])

  const productoPorId = useMemo(() => new Map((productos ?? []).map((p) => [p.id, p])), [productos])

  const lineaPorProducto = useMemo(
    () => new Map(carrito.items.filter((i) => i.producto_id && i.unidad === 'unidad').map((i) => [i.producto_id!, i])),
    [carrito.items],
  )

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
    if (producto.precio_libre) setModal({ tipo: 'monto', producto })
    else if (producto.unidad === 'kg') setModal({ tipo: 'peso', producto })
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

  const cobrar = async (pagos?: VentaPago[]) => {
    if (!hayItems) return
    if (!pagos && medio === 'efectivo' && recibido !== null && recibido < carrito.total) return
    const definitivos = pagos ?? [
      // Sin "paga con" se toma como que pagó justo.
      { id: nuevoId(), medio, monto: carrito.total, recibido: medio === 'efectivo' ? (recibido ?? carrito.total) : null },
    ]
    const items = carrito.items.map(({ unidad: _unidad, ...item }) => item)
    const venta = await registrarVenta(cajaId, items, definitivos)
    const efectivo = definitivos.find((p) => p.recibido !== null)
    setUltimaVenta({ venta, vuelto: efectivo ? efectivo.recibido! - efectivo.monto : 0 })
    carrito.vaciar()
    setMedio('efectivo')
    setPagaCon(null)
    cerrarModal()
  }

  const alPresionarEnBusqueda = (evento: KeyboardEvent<HTMLInputElement>) => {
    if (evento.key !== 'Enter') return
    evento.preventDefault()
    const texto = busqueda.trim()
    if (!texto) void cobrar()
    else if (pareceCodigoDeBarras(texto)) void procesarCodigo(texto)
    else if (resultados.length > 0) agregar(resultados[0])
  }

  const panel = (enHoja: boolean) => (
    <PanelVenta
      enHoja={enHoja}
      carrito={carrito}
      productoDe={(id) => (id ? productoPorId.get(id) : undefined)}
      medio={medio}
      alCambiarMedio={setMedio}
      recibido={recibido}
      alCambiarRecibido={(monto) => setPagaCon(monto === null ? null : { total: carrito.total, monto })}
      ultimaVenta={ultimaVenta}
      alVerTicket={(venta) => setModal({ tipo: 'ticket', venta })}
      alVarios={() => setModal({ tipo: 'varios' })}
      alDosMedios={() => setModal({ tipo: 'dos-medios' })}
      alCobrar={() => void cobrar()}
    />
  )

  return (
    <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="space-y-3 p-4 pb-3 md:p-6 md:pb-4">
          <div className="relative">
            <div className="flex gap-2">
              <label className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-2xl border border-borde bg-tarjeta px-4 focus-within:border-ambar">
                <span className="text-tenue">
                  <IconoBuscar />
                </span>
                <input
                  ref={inputBusqueda}
                  type="search"
                  autoFocus={tienePunteroFino}
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  onKeyDown={alPresionarEnBusqueda}
                  placeholder="Escaneá o buscá un producto…"
                  aria-label="Buscar producto"
                  className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-apagado"
                />
                {tienePunteroFino && <span className="hidden rounded-md border border-borde px-2 py-0.5 text-xs text-tenue lg:inline">Enter = cobrar</span>}
              </label>
              {camaraDisponible && (
                <button
                  onClick={() => setModal({ tipo: 'camara' })}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ambar text-fondo md:border md:border-borde md:bg-tarjeta md:text-tinta"
                  aria-label="Escanear con la cámara"
                >
                  <IconoCamara tamano={22} />
                </button>
              )}
            </div>
            {resultados.length > 0 && (
              <ul className="absolute inset-x-0 top-full z-10 mt-2 overflow-hidden rounded-2xl border border-borde bg-elevado shadow-2xl">
                {resultados.map((producto, indice) => (
                  <li key={producto.id}>
                    <button
                      onClick={() => agregar(producto)}
                      className={`flex w-full justify-between gap-3 px-4 py-3 text-left hover:bg-borde ${indice === 0 ? 'bg-borde/60' : ''}`}
                    >
                      <span className="truncate">{producto.nombre}</span>
                      <span className="shrink-0 font-semibold tabular-nums">{etiquetaPrecio(producto)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {codigoDesconocido && (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-error/40 bg-error/10 px-4 py-3">
              <span>
                No existe el código <strong className="font-mono">{codigoDesconocido}</strong>
              </span>
              <button onClick={() => setModal({ tipo: 'crear', codigo: codigoDesconocido })} className={`${botonPrimario} shrink-0 px-3 py-1.5 text-sm`}>
                Crear producto
              </button>
            </div>
          )}

          <div className="hidden grid-cols-[repeat(auto-fill,minmax(132px,1fr))] gap-3 md:grid">
            {CATEGORIAS.map((c) => {
              const Icono = ICONOS_CATEGORIA[c.valor]
              const elegida = categoria === c.valor
              return (
                <button
                  key={c.valor}
                  onClick={() => setCategoria(elegida ? null : c.valor)}
                  aria-pressed={elegida}
                  className={`flex h-[92px] flex-col items-start justify-between rounded-2xl p-3 text-left text-fondo ${c.color} ${
                    elegida ? 'outline-2 outline-offset-3 outline-tinta' : ''
                  }`}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-fondo/10">
                    <Icono tamano={18} />
                  </span>
                  <span>
                    <span className="block font-bold">{c.nombre}</span>
                    <span className="block text-xs text-fondo/75">{cantidadPorCategoria.get(c.valor) ?? 0} productos</span>
                  </span>
                </button>
              )
            })}
          </div>

          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:hidden">
            <button
              onClick={() => setCategoria(null)}
              aria-pressed={categoria === null}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${categoria === null ? 'bg-tinta text-fondo' : 'border border-borde text-tinta-suave'}`}
            >
              Todos
            </button>
            {CATEGORIAS.map((c) => (
              <button
                key={c.valor}
                onClick={() => setCategoria(categoria === c.valor ? null : c.valor)}
                aria-pressed={categoria === c.valor}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold text-fondo ${c.color} ${
                  categoria === c.valor ? 'outline-2 outline-offset-2 outline-tinta' : ''
                }`}
              >
                {c.nombre}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 md:px-6 md:pb-6">
          <div className="mb-3 flex items-baseline gap-3">
            <h2 className="font-display text-xl font-semibold">{datosCategoria(categoria)?.nombre ?? 'Todos los productos'}</h2>
            <span className="text-sm text-tenue">{visibles.length} productos</span>
            {categoria && (
              <button onClick={() => setCategoria(null)} className="ml-auto text-sm text-tinta-suave underline">
                Ver todos
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] md:gap-3">
            {visibles.map((producto) => (
              <TarjetaProducto
                key={producto.id}
                producto={producto}
                linea={lineaPorProducto.get(producto.id)}
                alAgregar={() => agregar(producto)}
                alCambiarCantidad={carrito.cambiarCantidad}
              />
            ))}
          </div>
        </div>

        <div className="border-t border-linea p-3 lg:hidden">
          {hayItems ? (
            <div className="flex items-center gap-3 rounded-2xl border border-borde bg-elevado p-2 pl-4">
              <button onClick={() => setModal({ tipo: 'hoja' })} className="flex flex-1 flex-col text-left">
                <span className="text-xs text-tenue">{carrito.items.length} en la venta · Ver venta</span>
                <span className="font-display text-2xl font-semibold tabular-nums">{formatearPesosCorto(carrito.total)}</span>
              </button>
              <button onClick={() => setModal({ tipo: 'hoja' })} className={`${botonPrimario} h-12 px-6`}>
                Cobrar
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-1">
              {ultimaVenta ? (
                <>
                  <span className="flex-1 text-sm">
                    ✓ Venta de {formatearPesosCorto(ultimaVenta.venta.total)}
                    {ultimaVenta.vuelto > 0 && (
                      <>
                        {' · '}Vuelto <strong className="text-salvia">{formatearPesosCorto(ultimaVenta.vuelto)}</strong>
                      </>
                    )}
                  </span>
                  <button onClick={() => setModal({ tipo: 'ticket', venta: ultimaVenta.venta })} className={`${botonSecundario} flex h-10 w-10 items-center justify-center`} aria-label="Ver ticket">
                    <IconoRecibo tamano={18} />
                  </button>
                </>
              ) : (
                <span className="flex-1 text-sm text-tenue">Sin productos en la venta</span>
              )}
              <button onClick={() => setModal({ tipo: 'varios' })} className={`${botonSecundario} h-10 px-3 text-sm`}>
                Varios $
              </button>
            </div>
          )}
        </div>
      </div>

      <aside className="hidden w-[340px] shrink-0 border-l border-linea bg-panel p-6 lg:block">{panel(false)}</aside>

      {modal?.tipo === 'hoja' && (
        <Modal titulo="Venta actual" alCerrar={cerrarModal}>
          {panel(true)}
        </Modal>
      )}
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
      {modal?.tipo === 'monto' && (
        <ModalMonto
          producto={modal.producto}
          alCerrar={cerrarModal}
          alConfirmar={(monto) => {
            carrito.agregarPrecioLibre(modal.producto, monto)
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
      {modal?.tipo === 'dos-medios' && <ModalDosMedios total={carrito.total} alCerrar={cerrarModal} alConfirmar={(pagos) => void cobrar(pagos)} />}
      {modal?.tipo === 'ticket' && <ModalTicket venta={modal.venta} alCerrar={cerrarModal} />}
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

interface TarjetaProps {
  producto: Producto
  linea: ItemCarrito | undefined
  alAgregar: () => void
  alCambiarCantidad: (id: string, cantidad: number) => void
}

function TarjetaProducto({ producto, linea, alAgregar, alCambiarCantidad }: TarjetaProps) {
  const categoria = datosCategoria(producto.categoria)
  const stock = etiquetaStock(producto)

  return (
    <div className={`flex min-h-32 flex-col rounded-2xl border-[1.5px] bg-tarjeta p-3 ${linea ? (categoria?.borde ?? 'border-arena') : 'border-linea'}`}>
      <button onClick={alAgregar} className="flex flex-1 flex-col items-start gap-1 text-left">
        <span className={`text-xs ${stock.alerta ? 'font-semibold text-ambar' : 'text-tenue'}`}>{stock.texto}</span>
        <span className="line-clamp-2 text-[15px] leading-snug font-semibold">{producto.nombre}</span>
      </button>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className="font-display text-lg font-semibold tabular-nums">{etiquetaPrecio(producto)}</span>
        {linea ? (
          <div className="flex items-center rounded-xl bg-fondo p-0.5">
            <button onClick={() => alCambiarCantidad(linea.id, linea.cantidad - 1)} aria-label="Uno menos" className="h-8 w-8 rounded-lg text-lg">
              −
            </button>
            <span className="w-6 text-center font-bold tabular-nums">{linea.cantidad}</span>
            <button
              onClick={() => alCambiarCantidad(linea.id, linea.cantidad + 1)}
              aria-label="Uno más"
              className={`h-8 w-8 rounded-lg text-lg text-fondo ${categoria?.color ?? 'bg-arena'}`}
            >
              +
            </button>
          </div>
        ) : (
          <button onClick={alAgregar} aria-label={`Agregar ${producto.nombre}`} className="h-9 w-9 shrink-0 rounded-xl bg-elevado text-xl hover:bg-borde">
            +
          </button>
        )}
      </div>
    </div>
  )
}

function etiquetaPrecio(producto: Producto) {
  if (producto.precio_libre) return 'Precio libre'
  return formatearPesosCorto(producto.precio_venta) + (producto.unidad === 'kg' ? ' /kg' : '')
}

function etiquetaStock(producto: Producto): { texto: string; alerta: boolean } {
  if (producto.precio_libre) return { texto: 'Se pide el monto', alerta: false }
  const bajo = producto.stock <= 0 || producto.stock <= producto.stock_minimo
  if (producto.unidad === 'kg') return { texto: formatearCantidad(producto.stock, 'kg'), alerta: bajo }
  if (producto.stock <= 0) return { texto: 'Sin stock', alerta: true }
  return { texto: bajo ? `Quedan ${producto.stock}` : `Stock ${producto.stock}`, alerta: bajo }
}

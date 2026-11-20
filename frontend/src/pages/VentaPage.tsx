import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useEffectEvent, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { EscanerCamara } from '../components/EscanerCamara'
import { IconoBuscar, IconoCamara, IconoRecibo } from '../components/Iconos'
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
import { useVivo } from '../hooks/useVivo'
import { useCajaAbierta } from '../lib/cajas'
import { camaraDisponible } from '../lib/camara'
import { formatearCantidad } from '../lib/cantidad'
import { CATEGORIAS, datosCategoria } from '../lib/categorias'
import { db } from '../lib/db'
import { formatearPesosCorto } from '../lib/dinero'
import { botonPrimario, botonSecundario, rotulo } from '../lib/estilos'
import { describirLinea } from '../lib/lineaVenta'
import type { Categoria, MedioPago, Producto, Venta, VentaPago } from '../lib/modelos'
import { buscarPorCodigo } from '../lib/productos'
import { normalizar, pareceCodigoDeBarras } from '../lib/texto'
import { nuevoId } from '../lib/uuid'
import { registrarVenta } from '../lib/ventas'
import type { VentaEnVivo } from '../lib/vivo'

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
  const [codigosDelCelu, setCodigosDelCelu] = useState<string[]>([])
  const procesandoDelCelu = useRef(false)
  const inputBusqueda = useRef<HTMLInputElement>(null)
  const { enviar: enviarEnVivo } = useVivo('caja', (mensaje) => {
    if (mensaje.tipo === 'codigo') setCodigosDelCelu((cola) => [...cola, mensaje.codigo])
  })

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

  const opcionesCategoria = [
    { valor: null, nombre: 'Todos', marcador: 'border border-apagado', cantidad: productos?.length ?? 0 },
    ...CATEGORIAS.map((c) => ({ valor: c.valor, nombre: c.nombre, marcador: c.color, cantidad: cantidadPorCategoria.get(c.valor) ?? 0 })),
  ]

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

  // Con una ventana abierta los códigos del celu esperan: no pisan un peso a medio cargar.
  const recibeDelCelu = modal === null || modal.tipo === 'hoja'

  const procesarDelCelu = useEffectEvent((codigo: string) => procesarCodigo(codigo))

  // De a uno: si el código abre una ventana (un producto por kg), los que siguen esperan a que se cierre.
  useEffect(() => {
    if (!recibeDelCelu || codigosDelCelu.length === 0 || procesandoDelCelu.current) return
    procesandoDelCelu.current = true
    void procesarDelCelu(codigosDelCelu[0]).finally(() => {
      procesandoDelCelu.current = false
      setCodigosDelCelu((cola) => cola.slice(1))
    })
  }, [recibeDelCelu, codigosDelCelu])

  const ventaEnVivo = useMemo<VentaEnVivo>(
    () => ({
      items: carrito.items.map((item) => ({
        id: item.id,
        nombre: item.nombre,
        subtotal: item.subtotal,
        ...describirLinea(item, item.producto_id ? productoPorId.get(item.producto_id) : undefined),
      })),
      total: carrito.total,
      recibido: medio === 'efectivo' ? recibido : null,
      cobrada: ultimaVenta && { id: ultimaVenta.venta.id, total: ultimaVenta.venta.total, vuelto: ultimaVenta.vuelto },
    }),
    [carrito.items, carrito.total, medio, recibido, ultimaVenta, productoPorId],
  )

  useEffect(() => {
    enviarEnVivo({ tipo: 'venta', venta: ventaEnVivo })
  }, [ventaEnVivo, enviarEnVivo])

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
        <div className="space-y-2 px-4 pt-2 md:px-7 md:pt-4">
          <div className="relative">
            <div className="flex items-center border-b border-borde focus-within:border-ambar">
              <label className="flex h-12 min-w-0 flex-1 items-center gap-3">
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
                {tienePunteroFino && <span className="hidden text-xs text-apagado lg:inline">Enter = cobrar</span>}
              </label>
              {camaraDisponible && (
                <button
                  onClick={() => setModal({ tipo: 'camara' })}
                  className="-mr-2 flex h-12 w-12 items-center justify-center text-ambar hover:text-tinta"
                  aria-label="Escanear con la cámara"
                >
                  <IconoCamara tamano={22} />
                </button>
              )}
            </div>
            {resultados.length > 0 && (
              <ul className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-md border border-borde bg-elevado shadow-2xl">
                {resultados.map((producto, indice) => (
                  <li key={producto.id}>
                    <button
                      onClick={() => agregar(producto)}
                      className={`flex w-full justify-between gap-3 px-4 py-3 text-left hover:bg-borde ${indice === 0 ? 'bg-borde/60' : ''}`}
                    >
                      <span className="truncate">{producto.nombre}</span>
                      <span className="shrink-0 font-display font-semibold tabular-nums">{etiquetaPrecio(producto)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {codigoDesconocido && (
            <div className="flex items-center justify-between gap-3 border-b border-error/50 py-2">
              <span className="text-error">
                No existe el código <strong className="font-mono">{codigoDesconocido}</strong>
              </span>
              <button onClick={() => setModal({ tipo: 'crear', codigo: codigoDesconocido })} className={`${botonPrimario} shrink-0 px-3 py-2 text-sm`}>
                Crear producto
              </button>
            </div>
          )}

          <div className="-mx-4 flex gap-5 overflow-x-auto border-b border-linea px-4 [scrollbar-width:none] md:hidden">
            {opcionesCategoria.map((opcion) => {
              const elegida = categoria === opcion.valor
              return (
                <button
                  key={opcion.nombre}
                  onClick={() => setCategoria(opcion.valor)}
                  aria-pressed={elegida}
                  className={`flex h-11 shrink-0 items-center gap-2 text-sm ${elegida ? 'font-bold text-tinta' : 'text-tinta-suave'}`}
                >
                  <span className={`h-2.5 w-2.5 rounded-[2px] ${opcion.marcador}`} />
                  {opcion.nombre}
                  {elegida && <span className="text-xs text-ambar tabular-nums">{opcion.cantidad}</span>}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 gap-7 px-4 md:px-7">
          <nav aria-label="Categorías" className="hidden w-44 shrink-0 overflow-y-auto pb-4 md:block">
            <p className={`${rotulo} py-3 text-apagado`}>Categorías</p>
            <ul className="border-b border-linea">
              {opcionesCategoria.map((opcion) => {
                const elegida = categoria === opcion.valor
                return (
                  <li key={opcion.nombre} className="border-t border-linea">
                    <button
                      onClick={() => setCategoria(opcion.valor)}
                      aria-pressed={elegida}
                      className={`flex h-11 w-full items-center gap-2.5 text-left text-sm ${elegida ? 'font-bold text-tinta' : 'text-tinta-suave hover:text-tinta'}`}
                    >
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-[2px] ${opcion.marcador}`} />
                      <span className="flex-1">{opcion.nombre}</span>
                      <span className={`text-xs tabular-nums ${elegida ? 'text-ambar' : 'text-apagado'}`}>{opcion.cantidad}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>

          <section className="min-h-0 min-w-0 flex-1 overflow-y-auto pb-4">
            <div className="flex items-baseline gap-3 pt-3 pb-2">
              <h2 className="font-display text-xl font-semibold tracking-tight md:text-2xl">{datosCategoria(categoria)?.nombre ?? 'Todos los productos'}</h2>
              <span className="text-sm text-tenue">{visibles.length} productos</span>
            </div>
            <ul className="grid border-t border-linea xl:grid-cols-2 xl:gap-x-8">
              {visibles.map((producto) => (
                <FilaProducto
                  key={producto.id}
                  producto={producto}
                  linea={lineaPorProducto.get(producto.id)}
                  alAgregar={() => agregar(producto)}
                  alCambiarCantidad={carrito.cambiarCantidad}
                />
              ))}
            </ul>
          </section>
        </div>

        <div className="border-t border-linea bg-panel px-4 py-3 lg:hidden">
          {hayItems ? (
            <div className="flex items-center gap-3">
              <button onClick={() => setModal({ tipo: 'hoja' })} className="flex min-w-0 flex-1 flex-col text-left">
                <span className="text-xs text-tenue">
                  {carrito.items.length} en la venta · <span className="underline">Ver venta</span>
                </span>
                <span className="font-display text-2xl font-semibold tracking-tight tabular-nums">{formatearPesosCorto(carrito.total)}</span>
              </button>
              <button onClick={() => setModal({ tipo: 'hoja' })} className={`${botonPrimario} h-12 px-6`}>
                Cobrar
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {ultimaVenta ? (
                <>
                  <span className="flex-1 text-sm">
                    Venta de {formatearPesosCorto(ultimaVenta.venta.total)}
                    {ultimaVenta.vuelto > 0 && (
                      <>
                        {' · '}Vuelto <strong className="text-salvia">{formatearPesosCorto(ultimaVenta.vuelto)}</strong>
                      </>
                    )}
                  </span>
                  <button
                    onClick={() => setModal({ tipo: 'ticket', venta: ultimaVenta.venta })}
                    className={`${botonSecundario} flex h-11 w-11 items-center justify-center`}
                    aria-label="Ver ticket"
                  >
                    <IconoRecibo tamano={18} />
                  </button>
                </>
              ) : (
                <span className="flex-1 text-sm text-tenue">Sin productos en la venta</span>
              )}
              <button onClick={() => setModal({ tipo: 'varios' })} className={`${botonSecundario} h-11 px-3 text-sm`}>
                Varios $
              </button>
            </div>
          )}
        </div>
      </div>

      <aside className="hidden w-[324px] shrink-0 border-l border-linea p-6 lg:block">{panel(false)}</aside>

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

interface FilaProps {
  producto: Producto
  linea: ItemCarrito | undefined
  alAgregar: () => void
  alCambiarCantidad: (id: string, cantidad: number) => void
}

function FilaProducto({ producto, linea, alAgregar, alCambiarCantidad }: FilaProps) {
  const stock = etiquetaStock(producto)

  return (
    <li className="flex min-h-14 items-center gap-2 border-b border-linea">
      <button onClick={alAgregar} className="flex min-w-0 flex-1 flex-col gap-0.5 py-2 text-left">
        <span className="leading-snug font-semibold">{producto.nombre}</span>
        <span className={`text-xs ${stock.alerta ? 'font-semibold text-ambar' : 'text-tenue'}`}>{stock.texto}</span>
      </button>
      <span className={`shrink-0 whitespace-nowrap ${producto.precio_libre ? 'text-sm text-tenue' : 'font-display font-semibold tabular-nums'}`}>
        {etiquetaPrecio(producto)}
      </span>
      {linea ? (
        <div className="flex w-24 shrink-0 items-center justify-end">
          <button onClick={() => alCambiarCantidad(linea.id, linea.cantidad - 1)} aria-label="Uno menos" className="h-11 w-9 text-xl text-tinta-suave hover:text-tinta">
            −
          </button>
          <span className="min-w-6 text-center font-bold text-ambar tabular-nums">{linea.cantidad}</span>
          <button onClick={() => alCambiarCantidad(linea.id, linea.cantidad + 1)} aria-label="Uno más" className="h-11 w-9 text-xl text-ambar hover:text-tinta">
            +
          </button>
        </div>
      ) : (
        <div className="flex w-24 shrink-0 justify-end">
          <button onClick={alAgregar} aria-label={`Agregar ${producto.nombre}`} className="h-11 w-11 text-2xl text-ambar hover:text-tinta">
            +
          </button>
        </div>
      )}
    </li>
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

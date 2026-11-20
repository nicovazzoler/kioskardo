import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState, type KeyboardEvent } from 'react'
import { EscanerCamara } from '../components/EscanerCamara'
import { IconoBuscar, IconoCamara } from '../components/Iconos'
import { FormularioProducto } from '../components/inventario/FormularioProducto'
import { useEscaner } from '../hooks/useEscaner'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { camaraDisponible } from '../lib/camara'
import { formatearCantidad } from '../lib/cantidad'
import { CATEGORIAS, datosCategoria } from '../lib/categorias'
import { db } from '../lib/db'
import { formatearPesosCorto } from '../lib/dinero'
import { botonPrimario, botonSecundario, claseOpcion, rotulo } from '../lib/estilos'
import type { Categoria, Producto } from '../lib/modelos'
import { buscarPorCodigo } from '../lib/productos'
import { normalizar, pareceCodigoDeBarras } from '../lib/texto'

type Filtro = 'todos' | 'stock-bajo' | 'sin-codigo' | 'inactivos'
type Formulario = { modo: 'nuevo'; codigo?: string } | { modo: 'editar'; id: string }

const FILTROS: { valor: Filtro; nombre: string; cumple: (p: Producto) => boolean }[] = [
  { valor: 'todos', nombre: 'Todos', cumple: (p) => p.activo },
  { valor: 'stock-bajo', nombre: 'Stock bajo', cumple: (p) => p.activo && tieneStockBajo(p) },
  { valor: 'sin-codigo', nombre: 'Sin código', cumple: (p) => p.activo && !p.codigo_barras },
  { valor: 'inactivos', nombre: 'Inactivos', cumple: (p) => !p.activo },
]

function tieneStockBajo(producto: Producto) {
  if (producto.precio_libre) return false
  return producto.stock <= 0 || producto.stock <= producto.stock_minimo
}

export function InventarioPage() {
  const productos = useLiveQuery(() => db.productos.orderBy('nombre').toArray(), [])
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [categoria, setCategoria] = useState<Categoria | null>(null)
  const [formulario, setFormulario] = useState<Formulario | null>(null)
  const [camara, setCamara] = useState(false)
  const conPanel = useMediaQuery('(min-width: 1024px)')

  const termino = normalizar(busqueda)
  const visibles = useMemo(() => {
    const todos = productos ?? []
    // Buscando, se recorre todo el catálogo: ni el filtro ni la categoría limitan la búsqueda.
    if (termino) return todos.filter((p) => normalizar(p.nombre).includes(termino) || p.codigo_barras?.includes(termino))
    const cumple = FILTROS.find((f) => f.valor === filtro)!.cumple
    return todos.filter((p) => cumple(p) && (categoria === null || p.categoria === categoria))
  }, [productos, termino, filtro, categoria])

  const cuantos = (f: (typeof FILTROS)[number]) => (productos ?? []).filter(f.cumple).length
  const conStockBajo = cuantos(FILTROS[1])

  // Escaneo desde cualquier lado: si el código existe se edita, si no se da de alta.
  const procesarCodigo = async (codigo: string) => {
    const producto = await buscarPorCodigo(codigo)
    setBusqueda('')
    setFormulario(producto ? { modo: 'editar', id: producto.id } : { modo: 'nuevo', codigo })
  }

  // Con el panel al costado se puede seguir escaneando para pasar de un producto a otro.
  useEscaner(procesarCodigo, !camara && (conPanel || formulario === null))

  const alPresionarEnBusqueda = (evento: KeyboardEvent<HTMLInputElement>) => {
    if (evento.key !== 'Enter') return
    if (pareceCodigoDeBarras(busqueda)) void procesarCodigo(busqueda.trim())
    else if (visibles.length === 1) setFormulario({ modo: 'editar', id: visibles[0].id })
  }

  const editando = formulario?.modo === 'editar' ? formulario.id : null
  const formularioAbierto = formulario && (
    <FormularioProducto
      comoPanel={conPanel}
      productoId={formulario.modo === 'editar' ? formulario.id : undefined}
      codigoInicial={formulario.modo === 'nuevo' ? formulario.codigo : undefined}
      alCerrar={() => setFormulario(null)}
      alEditarOtro={(otro) => setFormulario({ modo: 'editar', id: otro.id })}
    />
  )

  return (
    <div className="flex h-full">
      <section className="min-w-0 flex-1 overflow-y-auto p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">Inventario</h1>
            {productos && (
              <p className="text-sm text-tenue">
                {cuantos(FILTROS[0])} productos{conStockBajo > 0 && ` · ${conStockBajo} con stock bajo`}
              </p>
            )}
          </div>
          <div className="flex gap-1">
            {camaraDisponible && (
              <button onClick={() => setCamara(true)} className={`${botonSecundario} flex h-11 items-center gap-2 px-3 text-sm`}>
                <IconoCamara tamano={18} />
                Escanear
              </button>
            )}
            <button onClick={() => setFormulario({ modo: 'nuevo' })} className={`${botonPrimario} h-11 px-4 text-sm`}>
              + Nuevo producto
            </button>
          </div>
        </div>

        <label className="mt-3 flex h-12 items-center gap-3 border-b border-borde focus-within:border-ambar">
          <span className="text-tenue">
            <IconoBuscar />
          </span>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={alPresionarEnBusqueda}
            placeholder="Buscar por nombre o código, en todo el catálogo…"
            aria-label="Buscar producto"
            className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-apagado"
          />
        </label>

        {!termino && (
          <>
            <div className="-mx-4 mt-1 flex gap-6 overflow-x-auto border-b border-linea px-4 [scrollbar-width:none] md:mx-0 md:px-0">
              {FILTROS.map((f) => (
                <button key={f.valor} onClick={() => setFiltro(f.valor)} aria-pressed={filtro === f.valor} className={`h-11 shrink-0 text-sm ${claseOpcion(filtro === f.valor)}`}>
                  {f.nombre}{' '}
                  <span className={`tabular-nums ${f.valor === 'stock-bajo' && cuantos(f) > 0 ? 'text-ambar' : 'font-normal text-tenue'}`}>{cuantos(f)}</span>
                </button>
              ))}
            </div>
            <div className="-mx-4 mt-1 flex gap-x-5 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0">
              {CATEGORIAS.map((c) => {
                const elegida = categoria === c.valor
                return (
                  <button
                    key={c.valor}
                    onClick={() => setCategoria(elegida ? null : c.valor)}
                    aria-pressed={elegida}
                    className={`flex h-10 shrink-0 items-center gap-2 text-sm ${elegida ? 'font-bold text-tinta' : categoria ? 'text-apagado' : 'text-tinta-suave hover:text-tinta'}`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-[2px] ${c.color}`} />
                    {c.nombre}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {productos === undefined ? null : visibles.length === 0 ? (
          <ListaVacia
            hayProductos={productos.length > 0}
            busqueda={busqueda}
            alCrear={() => setFormulario({ modo: 'nuevo', codigo: pareceCodigoDeBarras(busqueda) ? busqueda.trim() : undefined })}
          />
        ) : (
          <div className="mt-2">
            <div className={`hidden grid-cols-[minmax(0,1fr)_80px_100px_64px] gap-3 border-b border-linea px-2 py-2.5 text-apagado md:grid ${rotulo}`}>
              <span>Producto</span>
              <span className="text-right">Stock</span>
              <span className="text-right">Precio</span>
              <span className="text-right">Margen</span>
            </div>
            <ul>
              {visibles.map((producto) => (
                <FilaProducto
                  key={producto.id}
                  producto={producto}
                  elegido={producto.id === editando}
                  alElegir={() => setFormulario({ modo: 'editar', id: producto.id })}
                />
              ))}
            </ul>
          </div>
        )}
      </section>

      {conPanel && (
        <aside className="w-[360px] shrink-0 overflow-y-auto bg-panel p-6">
          {formularioAbierto ?? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-tenue">
              <p className="font-display text-xl tracking-tight text-tinta-suave">Elegí un producto</p>
              <p className="text-sm">Tocalo en la lista o escaneá su código para editarlo y cargar stock.</p>
            </div>
          )}
        </aside>
      )}
      {!conPanel && formularioAbierto}

      {camara && (
        <EscanerCamara
          alCerrar={() => setCamara(false)}
          alDetectar={(codigo) => {
            setCamara(false)
            void procesarCodigo(codigo)
          }}
        />
      )}
    </div>
  )
}

function FilaProducto({ producto, elegido, alElegir }: { producto: Producto; elegido: boolean; alElegir: () => void }) {
  const categoria = datosCategoria(producto.categoria)
  const bajo = tieneStockBajo(producto)
  const margen = producto.costo && !producto.precio_libre ? Math.round(((producto.precio_venta - producto.costo) / producto.costo) * 100) : null

  return (
    <li className="border-b border-linea">
      <button
        onClick={alElegir}
        aria-current={elegido}
        className={`grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-2 py-2.5 text-left md:grid-cols-[minmax(0,1fr)_80px_100px_64px] ${
          elegido ? 'bg-panel' : 'hover:bg-panel/60'
        } ${producto.activo ? '' : 'opacity-50'}`}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-[2px] ${categoria ? categoria.color : 'border border-apagado'}`} title={categoria?.nombre ?? 'Sin categoría'} />
          <span className="min-w-0">
            <span className={`block truncate font-semibold ${elegido ? 'text-ambar' : ''}`}>{producto.nombre}</span>
            <span className="block truncate font-mono text-[11px] text-apagado">{producto.codigo_barras ?? 'sin código'}</span>
          </span>
        </span>
        <span className={`justify-self-end text-sm tabular-nums ${bajo ? 'font-bold text-ambar' : ''}`}>
          {producto.precio_libre ? <span className="text-apagado">—</span> : formatearCantidad(producto.stock, producto.unidad)}
        </span>
        <span className="text-right font-display font-semibold tabular-nums">
          {producto.precio_libre ? (
            <span className="text-sm font-normal text-tenue">Precio libre</span>
          ) : (
            <>
              {formatearPesosCorto(producto.precio_venta)}
              {producto.unidad === 'kg' && <span className="text-xs font-normal text-tenue"> /kg</span>}
            </>
          )}
        </span>
        <span className="hidden text-right text-sm text-tenue tabular-nums md:block">{margen === null ? '—' : `${margen}%`}</span>
      </button>
    </li>
  )
}

function ListaVacia({ hayProductos, busqueda, alCrear }: { hayProductos: boolean; busqueda: string; alCrear: () => void }) {
  return (
    <div className="mt-4 border-b border-linea py-10 text-center text-tenue">
      {hayProductos ? (
        <>
          <p>No hay productos que coincidan.</p>
          {busqueda && (
            <button onClick={alCrear} className="mt-3 font-semibold text-tinta underline">
              Crear {pareceCodigoDeBarras(busqueda) ? `producto con código ${busqueda.trim()}` : 'producto nuevo'}
            </button>
          )}
        </>
      ) : (
        <>
          <p className="font-semibold text-tinta-suave">Todavía no hay productos cargados.</p>
          <p className="mt-1">Escaneá un código con la pistola o tocá “+ Nuevo producto” para empezar.</p>
        </>
      )}
    </div>
  )
}

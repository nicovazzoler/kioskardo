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
import { botonPrimario, botonSecundario } from '../lib/estilos'
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
            <h1 className="font-display text-3xl font-semibold">Inventario</h1>
            {productos && (
              <p className="text-sm text-tenue">
                {cuantos(FILTROS[0])} productos{conStockBajo > 0 && ` · ${conStockBajo} con stock bajo`}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {camaraDisponible && (
              <button onClick={() => setCamara(true)} className={`${botonSecundario} flex h-11 items-center gap-2 px-4 text-sm`}>
                <IconoCamara tamano={18} />
                Escanear
              </button>
            )}
            <button onClick={() => setFormulario({ modo: 'nuevo' })} className={`${botonPrimario} h-11 px-4 text-sm`}>
              + Nuevo producto
            </button>
          </div>
        </div>

        <label className="mt-4 flex h-12 items-center gap-3 rounded-2xl border border-borde bg-tarjeta px-4 focus-within:border-ambar">
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
          <div className="-mx-4 mt-3 flex items-center gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0">
            {FILTROS.map((f) => (
              <button
                key={f.valor}
                onClick={() => setFiltro(f.valor)}
                aria-pressed={filtro === f.valor}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold ${
                  filtro === f.valor ? 'bg-tinta text-fondo' : 'border border-borde text-tinta-suave hover:bg-elevado'
                }`}
              >
                {f.valor === 'stock-bajo' && <span className="h-2 w-2 rounded-full bg-ambar" />}
                {f.nombre} {f.valor !== 'todos' && <span className="tabular-nums opacity-70">{cuantos(f)}</span>}
              </button>
            ))}
            <span className="mx-1 hidden h-5 w-px bg-borde sm:block" />
            {CATEGORIAS.map((c) => (
              <button
                key={c.valor}
                onClick={() => setCategoria(categoria === c.valor ? null : c.valor)}
                aria-pressed={categoria === c.valor}
                className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold text-fondo ${c.color} ${
                  categoria === c.valor ? 'outline-2 outline-offset-2 outline-tinta' : categoria ? 'opacity-50' : ''
                }`}
              >
                {c.nombre}
              </button>
            ))}
          </div>
        )}

        {productos === undefined ? null : visibles.length === 0 ? (
          <ListaVacia
            hayProductos={productos.length > 0}
            busqueda={busqueda}
            alCrear={() => setFormulario({ modo: 'nuevo', codigo: pareceCodigoDeBarras(busqueda) ? busqueda.trim() : undefined })}
          />
        ) : (
          <div className="mt-4 overflow-hidden rounded-2xl border border-linea bg-panel">
            <div className="hidden grid-cols-[minmax(0,1fr)_110px_80px_100px_60px] gap-3 border-b border-linea px-4 py-2.5 text-xs text-tenue md:grid">
              <span>Producto</span>
              <span>Categoría</span>
              <span className="text-right">Stock</span>
              <span className="text-right">Precio</span>
              <span className="text-right">Margen</span>
            </div>
            <ul className="divide-y divide-linea">
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
        <aside className="w-[360px] shrink-0 overflow-y-auto border-l border-linea bg-panel p-6">
          {formularioAbierto ?? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-tenue">
              <p className="font-display text-xl text-tinta-suave">Elegí un producto</p>
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
    <li>
      <button
        onClick={alElegir}
        aria-current={elegido}
        className={`grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-2.5 text-left md:grid-cols-[minmax(0,1fr)_110px_80px_100px_60px] ${
          elegido ? 'bg-elevado shadow-[inset_0_0_0_1.5px_var(--color-ambar)]' : 'hover:bg-tarjeta'
        } ${producto.activo ? '' : 'opacity-50'}`}
      >
        <span className="min-w-0">
          <span className="block truncate font-semibold">{producto.nombre}</span>
          <span className="block truncate font-mono text-[11px] text-apagado">{producto.codigo_barras ?? 'sin código'}</span>
        </span>
        <span className="hidden md:block">
          {categoria ? (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold text-fondo ${categoria.color}`}>{categoria.nombre}</span>
          ) : (
            <span className="text-xs text-apagado">—</span>
          )}
        </span>
        <span className="justify-self-end text-sm tabular-nums">
          {producto.precio_libre ? (
            <span className="text-apagado">—</span>
          ) : bajo ? (
            <span className="rounded-full bg-ambar px-2.5 py-0.5 font-bold text-fondo">{formatearCantidad(producto.stock, producto.unidad)}</span>
          ) : (
            formatearCantidad(producto.stock, producto.unidad)
          )}
        </span>
        <span className="text-right font-semibold tabular-nums">
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
    <div className="mt-4 rounded-2xl border border-dashed border-borde p-8 text-center text-tenue">
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

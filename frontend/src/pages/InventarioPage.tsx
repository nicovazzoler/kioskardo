import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState, type KeyboardEvent } from 'react'
import { EscanerCamara } from '../components/EscanerCamara'
import { camaraDisponible } from '../lib/camara'
import { FormularioProducto } from '../components/inventario/FormularioProducto'
import { useEscaner } from '../hooks/useEscaner'
import { formatearCantidad } from '../lib/cantidad'
import { db } from '../lib/db'
import { formatearPesos } from '../lib/dinero'
import type { Producto } from '../lib/modelos'
import { buscarPorCodigo } from '../lib/productos'
import { normalizar, pareceCodigoDeBarras } from '../lib/texto'

type Filtro = 'activos' | 'stock-bajo' | 'inactivos'
type Formulario = { modo: 'nuevo'; codigo?: string } | { modo: 'editar'; id: string }

const FILTROS: { valor: Filtro; nombre: string }[] = [
  { valor: 'activos', nombre: 'Todos' },
  { valor: 'stock-bajo', nombre: 'Stock bajo' },
  { valor: 'inactivos', nombre: 'Inactivos' },
]

function tieneStockBajo(producto: Producto) {
  return producto.stock <= 0 || producto.stock <= producto.stock_minimo
}

export function InventarioPage() {
  const productos = useLiveQuery(() => db.productos.orderBy('nombre').toArray(), [])
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('activos')
  const [formulario, setFormulario] = useState<Formulario | null>(null)
  const [camara, setCamara] = useState(false)

  // useMemo: recalcula la lista filtrada solo si cambian los productos, la búsqueda o el filtro.
  const visibles = useMemo(() => {
    const termino = normalizar(busqueda)
    return (productos ?? []).filter((p) => {
      if (filtro === 'inactivos' ? p.activo : !p.activo) return false
      if (filtro === 'stock-bajo' && !tieneStockBajo(p)) return false
      return !termino || normalizar(p.nombre).includes(termino) || p.codigo_barras?.includes(termino)
    })
  }, [productos, busqueda, filtro])

  // Escaneo desde cualquier lado: si el código existe se edita, si no se da de alta.
  const procesarCodigo = async (codigo: string) => {
    const producto = await buscarPorCodigo(codigo)
    setBusqueda('')
    setFormulario(producto ? { modo: 'editar', id: producto.id } : { modo: 'nuevo', codigo })
  }

  useEscaner(procesarCodigo, formulario === null && !camara)

  const alPresionarEnBusqueda = (evento: KeyboardEvent<HTMLInputElement>) => {
    if (evento.key !== 'Enter') return
    if (pareceCodigoDeBarras(busqueda)) void procesarCodigo(busqueda.trim())
    else if (visibles.length === 1) setFormulario({ modo: 'editar', id: visibles[0].id })
  }

  return (
    <section className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Inventario</h1>
        <button
          onClick={() => setFormulario({ modo: 'nuevo' })}
          className="rounded-lg bg-marca-700 px-4 py-2.5 font-semibold text-white hover:bg-marca-800"
        >
          + Nuevo
        </button>
      </div>

      <div className="mt-4 flex gap-2">
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          onKeyDown={alPresionarEnBusqueda}
          placeholder="Buscar por nombre o escanear código…"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-4 py-3 text-base"
        />
        {camaraDisponible && (
          <button onClick={() => setCamara(true)} className="rounded-lg border border-slate-300 bg-white px-4 text-xl" aria-label="Escanear con cámara">
            📷
          </button>
        )}
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto">
        {FILTROS.map((f) => (
          <button
            key={f.valor}
            onClick={() => setFiltro(f.valor)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium ${
              filtro === f.valor ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'
            }`}
          >
            {f.nombre}
          </button>
        ))}
      </div>

      {productos === undefined ? null : visibles.length === 0 ? (
        <ListaVacia hayProductos={productos.length > 0} busqueda={busqueda} alCrear={() => setFormulario({ modo: 'nuevo', codigo: pareceCodigoDeBarras(busqueda) ? busqueda.trim() : undefined })} />
      ) : (
        <ul className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
          {visibles.map((producto) => (
            <li key={producto.id}>
              <button
                onClick={() => setFormulario({ modo: 'editar', id: producto.id })}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{producto.nombre}</p>
                  <p className="truncate font-mono text-xs text-slate-400">{producto.codigo_barras ?? 'sin código'}</p>
                </div>
                <span
                  className={`rounded-md px-2 py-0.5 text-sm tabular-nums ${
                    tieneStockBajo(producto) ? 'bg-red-50 text-red-700' : 'text-slate-500'
                  }`}
                >
                  {formatearCantidad(producto.stock, producto.unidad)}
                </span>
                <span className="w-28 text-right font-semibold tabular-nums">
                  {formatearPesos(producto.precio_venta)}
                  {producto.unidad === 'kg' && <span className="text-xs font-normal text-slate-400">/kg</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {formulario && (
        <FormularioProducto
          productoId={formulario.modo === 'editar' ? formulario.id : undefined}
          codigoInicial={formulario.modo === 'nuevo' ? formulario.codigo : undefined}
          alCerrar={() => setFormulario(null)}
          alEditarOtro={(otro) => setFormulario({ modo: 'editar', id: otro.id })}
        />
      )}

      {camara && (
        <EscanerCamara
          alCerrar={() => setCamara(false)}
          alDetectar={(codigo) => {
            setCamara(false)
            void procesarCodigo(codigo)
          }}
        />
      )}
    </section>
  )
}

function ListaVacia({ hayProductos, busqueda, alCrear }: { hayProductos: boolean; busqueda: string; alCrear: () => void }) {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
      {hayProductos ? (
        <>
          <p>No hay productos que coincidan.</p>
          {busqueda && (
            <button onClick={alCrear} className="mt-3 font-medium text-marca-700 underline">
              Crear {pareceCodigoDeBarras(busqueda) ? `producto con código ${busqueda.trim()}` : 'producto nuevo'}
            </button>
          )}
        </>
      ) : (
        <>
          <p className="font-medium text-slate-700">Todavía no hay productos cargados.</p>
          <p className="mt-1">Escaneá un código con la pistola o tocá “+ Nuevo” para empezar.</p>
        </>
      )}
    </div>
  )
}

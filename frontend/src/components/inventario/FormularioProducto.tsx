import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { parsearCantidad } from '../../lib/cantidad'
import { centavosATexto, formatearPesos, parsearPesos } from '../../lib/dinero'
import { db } from '../../lib/db'
import { CATEGORIAS } from '../../lib/categorias'
import type { Categoria, Producto, Unidad } from '../../lib/modelos'
import { buscarPorCodigo, guardarProducto, moverStock } from '../../lib/productos'
import { nuevoId } from '../../lib/uuid'
import { camaraDisponible } from '../../lib/camara'
import { botonPrimario, botonSecundario, claseInput, claseOpcion } from '../../lib/estilos'
import { EscanerCamara } from '../EscanerCamara'
import { IconoCamara } from '../Iconos'
import { Modal } from '../Modal'
import { Campo, InputPesos } from '../Campos'
import { AjusteStock } from './AjusteStock'

interface Props {
  // Sin productoId es un alta; con productoId, una edición.
  productoId?: string
  codigoInicial?: string
  alCerrar: () => void
  alEditarOtro?: (producto: Producto) => void
  // Si está, se llama al terminar un alta con el id nuevo (ej: la venta lo agrega al carrito).
  // En ese caso no se ofrece "Guardar y cargar otro".
  alCrear?: (id: string) => void
  // En tablet, Inventario lo muestra como panel al costado de la lista en vez de en un modal.
  comoPanel?: boolean
}

type SeVendePor = Unidad | 'libre'

const OPCIONES_VENTA: { valor: SeVendePor; nombre: string }[] = [
  { valor: 'unidad', nombre: 'Unidad' },
  { valor: 'kg', nombre: 'Peso (kg)' },
  { valor: 'libre', nombre: 'Precio libre' },
]

interface Campos {
  codigo: string
  nombre: string
  precio: string
  costo: string
  seVendePor: SeVendePor
  categoria: Categoria | null
  stockInicial: string
  stockMinimo: string
}

function camposDesde(producto: Producto | undefined, codigoInicial = ''): Campos {
  return {
    codigo: producto?.codigo_barras ?? codigoInicial,
    nombre: producto?.nombre ?? '',
    precio: centavosATexto(producto?.precio_venta ?? null),
    costo: centavosATexto(producto?.costo ?? null),
    seVendePor: producto?.precio_libre ? 'libre' : (producto?.unidad ?? 'unidad'),
    categoria: producto?.categoria ?? null,
    stockInicial: '',
    stockMinimo: producto?.stock_minimo ? String(producto.stock_minimo) : '',
  }
}

export function FormularioProducto({ productoId, codigoInicial, alCerrar, alEditarOtro, alCrear, comoPanel }: Props) {
  const producto = useLiveQuery(() => (productoId ? db.productos.get(productoId) : undefined), [productoId])
  const esAlta = !productoId

  // Mientras el producto carga desde IndexedDB, no se muestra el formulario vacío.
  if (!esAlta && !producto) return null

  const titulo = esAlta ? 'Nuevo producto' : 'Editar producto'
  const contenido = (
    <>
      {producto && !producto.precio_libre && <AjusteStock producto={producto} />}
      <Formulario
        // key: al cambiar de producto, React descarta el formulario anterior y arranca uno limpio.
        key={productoId ?? `nuevo-${codigoInicial ?? ''}`}
        producto={producto}
        codigoInicial={codigoInicial}
        alCerrar={alCerrar}
        alEditarOtro={alEditarOtro}
        alCrear={alCrear}
      />
    </>
  )

  if (!comoPanel) {
    return (
      <Modal titulo={titulo} alCerrar={alCerrar}>
        {contenido}
      </Modal>
    )
  }
  return (
    <section aria-label={titulo}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-tenue">{titulo}</p>
          {producto && <h2 className="font-display text-2xl leading-tight font-semibold">{producto.nombre}</h2>}
        </div>
        <button onClick={alCerrar} aria-label="Cerrar" className={`${botonSecundario} flex h-10 w-10 shrink-0 items-center justify-center text-2xl leading-none text-tenue`}>
          ×
        </button>
      </header>
      {contenido}
    </section>
  )
}

function Formulario({
  producto,
  codigoInicial,
  alCerrar,
  alEditarOtro,
  alCrear,
}: Omit<Props, 'productoId'> & { producto?: Producto }) {
  const esAlta = !producto
  const [campos, setCampos] = useState(() => camposDesde(producto, codigoInicial))
  const [intentoGuardar, setIntentoGuardar] = useState(false)
  const [ultimoGuardado, setUltimoGuardado] = useState<string | null>(null)
  const [camara, setCamara] = useState(false)
  const inputCodigo = useRef<HTMLInputElement>(null)
  const inputNombre = useRef<HTMLInputElement>(null)
  const inputPrecio = useRef<HTMLInputElement>(null)

  const cambiar = <K extends keyof Campos>(campo: K, valor: Campos[K]) =>
    setCampos((actuales) => ({ ...actuales, [campo]: valor }))

  const codigo = campos.codigo.trim()
  const duplicado = useLiveQuery(() => (codigo ? buscarPorCodigo(codigo) : undefined), [codigo])
  const hayDuplicado = !!duplicado && duplicado.id !== producto?.id

  const precioLibre = campos.seVendePor === 'libre'
  const unidad: Unidad = campos.seVendePor === 'libre' ? 'unidad' : campos.seVendePor
  const precio = precioLibre ? 0 : parsearPesos(campos.precio)
  const costo = !precioLibre && campos.costo.trim() ? parsearPesos(campos.costo) : null
  const stockInicial = !precioLibre && campos.stockInicial.trim() ? parsearCantidad(campos.stockInicial, unidad) : 0
  const stockMinimo = !precioLibre && campos.stockMinimo.trim() ? parsearCantidad(campos.stockMinimo, unidad) : 0
  const margen = precio !== null && costo ? Math.round(((precio - costo) / costo) * 100) : null

  const errores = {
    nombre: !campos.nombre.trim() ? 'Falta el nombre' : null,
    precio: precio === null ? 'Precio inválido' : null,
    costo: !precioLibre && campos.costo.trim() && costo === null ? 'Costo inválido' : null,
    stockInicial: stockInicial === null ? 'Cantidad inválida' : null,
    stockMinimo: stockMinimo === null ? 'Cantidad inválida' : null,
  }
  const esValido = !hayDuplicado && Object.values(errores).every((e) => e === null)

  // La pistola termina cada código con Enter: en vez de enviar el form, se pasa al campo siguiente.
  const alPresionarEnCodigo = (evento: KeyboardEvent<HTMLInputElement>) => {
    if (evento.key !== 'Enter') return
    evento.preventDefault()
    ;(campos.nombre ? inputPrecio : inputNombre).current?.focus()
  }

  const guardar = async (evento: FormEvent, cargarOtro: boolean) => {
    evento.preventDefault()
    setIntentoGuardar(true)
    if (!esValido) return

    const id = producto?.id ?? nuevoId()
    await guardarProducto(id, {
      codigo_barras: codigo || null,
      nombre: campos.nombre.trim(),
      precio_venta: precio!,
      costo,
      unidad,
      precio_libre: precioLibre,
      categoria: campos.categoria,
      stock_minimo: stockMinimo!,
      activo: producto?.activo ?? true,
    })
    if (esAlta && stockInicial) {
      const guardado = await db.productos.get(id)
      await moverStock(guardado!, 'ajuste', stockInicial)
    }

    if (esAlta) alCrear?.(id)
    if (!cargarOtro) return alCerrar()
    setUltimoGuardado(campos.nombre.trim())
    // Se conserva cómo se vende y la categoría: al cargar mercadería suelen venir varios productos del mismo tipo.
    setCampos({ ...camposDesde(undefined), seVendePor: campos.seVendePor, categoria: campos.categoria })
    setIntentoGuardar(false)
    inputCodigo.current?.focus()
  }

  const cambiarActivo = async () => {
    if (!producto) return
    const { id, stock: _stock, ...datos } = producto
    await guardarProducto(id, { ...datos, activo: !producto.activo })
    alCerrar()
  }

  return (
    <form onSubmit={(e) => guardar(e, false)} className="mt-4 space-y-4" noValidate>
      {ultimoGuardado && (
        <p className="rounded-xl bg-salvia/15 px-3 py-2 text-sm text-salvia">✓ Guardado: {ultimoGuardado}</p>
      )}

      <Campo etiqueta="Código de barras" ayuda="Escaneá con la pistola o la cámara. Vacío si no tiene.">
        <div className="flex gap-2">
          <input
            ref={inputCodigo}
            autoFocus={esAlta && !codigoInicial}
            value={campos.codigo}
            onChange={(e) => cambiar('codigo', e.target.value)}
            onKeyDown={alPresionarEnCodigo}
            inputMode="numeric"
            className={claseInput(hayDuplicado)}
          />
          {camaraDisponible && (
            <button type="button" onClick={() => setCamara(true)} className={`${botonSecundario} px-3`} aria-label="Escanear con cámara">
              <IconoCamara />
            </button>
          )}
        </div>
        {hayDuplicado && (
          <p className="mt-1 text-sm text-error">
            Ya existe: <strong>{duplicado.nombre}</strong>.{' '}
            {alEditarOtro && (
              <button type="button" className="underline" onClick={() => alEditarOtro(duplicado)}>
                Editar ese
              </button>
            )}
          </p>
        )}
      </Campo>

      <Campo etiqueta="Nombre" error={intentoGuardar ? errores.nombre : null}>
        <input
          ref={inputNombre}
          autoFocus={esAlta && !!codigoInicial}
          value={campos.nombre}
          onChange={(e) => cambiar('nombre', e.target.value)}
          placeholder="Ej: Alfajor Jorgito negro"
          className={claseInput(intentoGuardar && !!errores.nombre)}
        />
      </Campo>

      {!precioLibre && (
        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Precio de venta" error={intentoGuardar ? errores.precio : null}>
            <InputPesos ref={inputPrecio} valor={campos.precio} alCambiar={(v) => cambiar('precio', v)} error={intentoGuardar && !!errores.precio} />
          </Campo>
          <Campo
            etiqueta="Costo (opcional)"
            error={errores.costo}
            ayuda={margen !== null ? `Margen: ${margen}%` : undefined}
          >
            <InputPesos valor={campos.costo} alCambiar={(v) => cambiar('costo', v)} error={!!errores.costo} />
          </Campo>
        </div>
      )}

      <Campo etiqueta="Categoría" grupo>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIAS.map((c) => (
            <button
              key={c.valor}
              type="button"
              onClick={() => cambiar('categoria', campos.categoria === c.valor ? null : c.valor)}
              aria-pressed={campos.categoria === c.valor}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                campos.categoria === c.valor ? `${c.color} text-fondo` : 'border border-borde text-tinta-suave hover:bg-elevado'
              }`}
            >
              {c.nombre}
            </button>
          ))}
        </div>
      </Campo>

      <Campo etiqueta="Se vende por" grupo ayuda={precioLibre ? 'Al venderlo se tipea el monto. No lleva stock.' : undefined}>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-fondo p-1">
          {OPCIONES_VENTA.map((opcion) => (
            <button
              key={opcion.valor}
              type="button"
              onClick={() => cambiar('seVendePor', opcion.valor)}
              className={`rounded-lg py-2 text-sm font-semibold ${claseOpcion(campos.seVendePor === opcion.valor)}`}
            >
              {opcion.nombre}
            </button>
          ))}
        </div>
      </Campo>

      {!precioLibre && (
        <div className="grid grid-cols-2 gap-3">
          {esAlta && (
            <Campo etiqueta="Stock inicial" error={errores.stockInicial}>
              <input
                value={campos.stockInicial}
                onChange={(e) => cambiar('stockInicial', e.target.value)}
                inputMode="decimal"
                placeholder="0"
                className={claseInput(!!errores.stockInicial)}
              />
            </Campo>
          )}
          <Campo etiqueta="Avisar si baja de" error={errores.stockMinimo}>
            <input
              value={campos.stockMinimo}
              onChange={(e) => cambiar('stockMinimo', e.target.value)}
              inputMode="decimal"
              placeholder="0"
              className={claseInput(!!errores.stockMinimo)}
            />
          </Campo>
        </div>
      )}

      {intentoGuardar && !precioLibre && precio === 0 && (
        <p className="text-sm text-ambar">Ojo: el precio es {formatearPesos(0)}.</p>
      )}

      <div className="flex flex-col gap-2 pt-2 md:flex-row-reverse">
        <button type="submit" className={`${botonPrimario} flex-1 py-3`}>
          Guardar
        </button>
        {esAlta ? (
          !alCrear && <button type="button" onClick={(e) => guardar(e, true)} className={`${botonSecundario} flex-1 py-3`}>
            Guardar y cargar otro
          </button>
        ) : (
          <button type="button" onClick={cambiarActivo} className={`${botonSecundario} flex-1 py-3 text-tenue`}>
            {producto.activo ? 'Desactivar producto' : 'Reactivar producto'}
          </button>
        )}
      </div>

      {camara && (
        <EscanerCamara
          alCerrar={() => setCamara(false)}
          alDetectar={(leido) => {
            setCamara(false)
            cambiar('codigo', leido)
            ;(campos.nombre ? inputPrecio : inputNombre).current?.focus()
          }}
        />
      )}
    </form>
  )
}

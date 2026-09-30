import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { parsearCantidad } from '../../lib/cantidad'
import { centavosATexto, formatearPesos, parsearPesos } from '../../lib/dinero'
import { db } from '../../lib/db'
import type { Producto, Unidad } from '../../lib/modelos'
import { buscarPorCodigo, guardarProducto, moverStock } from '../../lib/productos'
import { nuevoId } from '../../lib/uuid'
import { camaraDisponible } from '../../lib/camara'
import { claseInput } from '../../lib/estilos'
import { EscanerCamara } from '../EscanerCamara'
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
}

interface Campos {
  codigo: string
  nombre: string
  precio: string
  costo: string
  unidad: Unidad
  stockInicial: string
  stockMinimo: string
}

function camposDesde(producto: Producto | undefined, codigoInicial = ''): Campos {
  return {
    codigo: producto?.codigo_barras ?? codigoInicial,
    nombre: producto?.nombre ?? '',
    precio: centavosATexto(producto?.precio_venta ?? null),
    costo: centavosATexto(producto?.costo ?? null),
    unidad: producto?.unidad ?? 'unidad',
    stockInicial: '',
    stockMinimo: producto?.stock_minimo ? String(producto.stock_minimo) : '',
  }
}

export function FormularioProducto({ productoId, codigoInicial, alCerrar, alEditarOtro, alCrear }: Props) {
  // useLiveQuery se re-ejecuta solo cuando cambian los datos en IndexedDB (ej: al ajustar stock).
  const producto = useLiveQuery(() => (productoId ? db.productos.get(productoId) : undefined), [productoId])
  const esAlta = !productoId

  // Mientras el producto carga desde IndexedDB, no se muestra el formulario vacío.
  if (!esAlta && !producto) return null

  return (
    <Modal titulo={esAlta ? 'Nuevo producto' : 'Editar producto'} alCerrar={alCerrar}>
      {producto && <AjusteStock producto={producto} />}
      <Formulario
        // key: al cambiar de producto, React descarta el formulario anterior y arranca uno limpio.
        key={productoId ?? 'nuevo'}
        producto={producto}
        codigoInicial={codigoInicial}
        alCerrar={alCerrar}
        alEditarOtro={alEditarOtro}
        alCrear={alCrear}
      />
    </Modal>
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

  const precio = parsearPesos(campos.precio)
  const costo = campos.costo.trim() ? parsearPesos(campos.costo) : null
  const stockInicial = campos.stockInicial.trim() ? parsearCantidad(campos.stockInicial, campos.unidad) : 0
  const stockMinimo = campos.stockMinimo.trim() ? parsearCantidad(campos.stockMinimo, campos.unidad) : 0
  const margen = precio !== null && costo ? Math.round(((precio - costo) / costo) * 100) : null

  const errores = {
    nombre: !campos.nombre.trim() ? 'Falta el nombre' : null,
    precio: precio === null ? 'Precio inválido' : null,
    costo: campos.costo.trim() && costo === null ? 'Costo inválido' : null,
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
      unidad: campos.unidad,
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
    // Se conserva la unidad: al cargar mercadería suelen venir varios productos del mismo tipo.
    setCampos({ ...camposDesde(undefined), unidad: campos.unidad })
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
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">✓ Guardado: {ultimoGuardado}</p>
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
            <button type="button" onClick={() => setCamara(true)} className="rounded-lg border border-slate-300 px-3 text-xl" aria-label="Escanear con cámara">
              📷
            </button>
          )}
        </div>
        {hayDuplicado && (
          <p className="mt-1 text-sm text-red-600">
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

      <Campo etiqueta="Se vende por" grupo>
        <div className="grid grid-cols-2 gap-2">
          {(['unidad', 'kg'] as const).map((unidad) => (
            <button
              key={unidad}
              type="button"
              onClick={() => cambiar('unidad', unidad)}
              className={`rounded-lg border py-2 font-medium ${
                campos.unidad === unidad ? 'border-marca-600 bg-marca-50 text-marca-800' : 'border-slate-300 text-slate-600'
              }`}
            >
              {unidad === 'unidad' ? 'Unidad' : 'Peso (kg)'}
            </button>
          ))}
        </div>
      </Campo>

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

      {intentoGuardar && precio !== null && precio === 0 && (
        <p className="text-sm text-amber-700">Ojo: el precio es {formatearPesos(0)}.</p>
      )}

      <div className="flex flex-col gap-2 pt-2 md:flex-row-reverse">
        <button type="submit" className="flex-1 rounded-lg bg-marca-700 py-3 font-semibold text-white hover:bg-marca-800">
          Guardar
        </button>
        {esAlta ? (
          !alCrear && <button type="button" onClick={(e) => guardar(e, true)} className="flex-1 rounded-lg border border-marca-700 py-3 font-semibold text-marca-700">
            Guardar y cargar otro
          </button>
        ) : (
          <button type="button" onClick={cambiarActivo} className="flex-1 rounded-lg border border-slate-300 py-3 text-slate-600">
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

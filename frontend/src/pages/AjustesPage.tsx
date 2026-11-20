import { useState, type FormEvent } from 'react'
import { Campo } from '../components/Campos'
import { VistaTicket } from '../components/ticket/VistaTicket'
import { claseInput } from '../lib/estilos'
import { guardarColumnas, imprimir, leerColumnas, PAPELES } from '../lib/impresora'
import { guardarKiosko, useKiosko } from '../lib/kiosko'
import type { Kiosko, KioskoGuardar, Venta } from '../lib/modelos'
import { armarTicket } from '../lib/ticket'

const VENTA_DE_EJEMPLO: Venta = {
  id: '7f3a91c2-0000-4000-8000-000000000000',
  caja_id: '',
  total: 1070000,
  anulada: false,
  creado_en: new Date().toISOString(),
  items: [
    { id: '1', producto_id: null, nombre: 'Gaseosa cola 500 ml', precio_unitario: 250000, cantidad: 2, subtotal: 500000 },
    { id: '2', producto_id: null, nombre: 'Caramelos surtidos', precio_unitario: 900000, cantidad: 0.25, subtotal: 225000 },
    { id: '3', producto_id: null, nombre: 'Fiambre', precio_unitario: 345000, cantidad: 1, subtotal: 345000 },
  ],
  pagos: [{ id: 'p', medio: 'efectivo', monto: 1070000, recibido: 2000000 }],
}

export function AjustesPage() {
  const kiosko = useKiosko()

  return (
    <section className="mx-auto max-w-5xl p-4 md:p-6">
      <h1 className="font-display text-3xl font-semibold">Ajustes</h1>
      {kiosko ? (
        <AjustesTicket kiosko={kiosko} />
      ) : (
        <p className="mt-4 rounded-xl bg-ambar/10 px-4 py-3 text-ambar">
          Los datos del negocio se cargan la primera vez que la app se conecta al servidor. Revisá la conexión.
        </p>
      )}
    </section>
  )
}

function AjustesTicket({ kiosko }: { kiosko: Kiosko }) {
  const [campos, setCampos] = useState({
    nombre: kiosko.nombre,
    direccion: kiosko.direccion ?? '',
    telefono: kiosko.telefono ?? '',
    pie: kiosko.pie_ticket ?? '',
  })
  const [columnas, setColumnas] = useState(leerColumnas)
  const [estado, setEstado] = useState<'editando' | 'guardado' | 'falta-nombre'>('editando')

  const cambiar = (campo: keyof typeof campos, valor: string) => {
    setCampos((actuales) => ({ ...actuales, [campo]: valor }))
    setEstado('editando')
  }

  const datos: KioskoGuardar = {
    nombre: campos.nombre.trim(),
    direccion: campos.direccion.trim() || null,
    telefono: campos.telefono.trim() || null,
    pie_ticket: campos.pie.trim() || null,
  }
  const lineas = armarTicket(VENTA_DE_EJEMPLO, { ...datos, nombre: datos.nombre || 'Nombre del negocio' }, columnas)

  const guardar = async (evento: FormEvent) => {
    evento.preventDefault()
    if (!datos.nombre) return setEstado('falta-nombre')
    await guardarKiosko(kiosko.id, datos)
    setEstado('guardado')
  }

  const elegirPapel = (nuevas: number) => {
    setColumnas(nuevas)
    guardarColumnas(nuevas)
  }

  return (
    <div className="mt-4 grid gap-6 md:grid-cols-[1fr_auto] md:items-start">
      <div className="space-y-6">
        <form onSubmit={guardar} className="space-y-4 rounded-3xl border border-linea bg-panel p-5" noValidate>
          <h2 className="font-display text-xl font-semibold">Datos del ticket</h2>
          <Campo etiqueta="Nombre del negocio" error={estado === 'falta-nombre' ? 'Falta el nombre' : null}>
            <input value={campos.nombre} onChange={(e) => cambiar('nombre', e.target.value)} className={claseInput(estado === 'falta-nombre')} />
          </Campo>
          <Campo etiqueta="Dirección (opcional)">
            <input value={campos.direccion} onChange={(e) => cambiar('direccion', e.target.value)} placeholder="Ej: Av. Siempreviva 742" className={claseInput()} />
          </Campo>
          <Campo etiqueta="Teléfono (opcional)">
            <input value={campos.telefono} onChange={(e) => cambiar('telefono', e.target.value)} inputMode="tel" className={claseInput()} />
          </Campo>
          <Campo etiqueta="Mensaje al pie (opcional)">
            <input value={campos.pie} onChange={(e) => cambiar('pie', e.target.value)} placeholder="¡Gracias por su compra!" className={claseInput()} />
          </Campo>
          <div className="flex items-center gap-3">
            <button type="submit" className="rounded-xl bg-tinta px-6 py-2.5 font-semibold text-fondo hover:bg-white">
              Guardar
            </button>
            {estado === 'guardado' && <span className="text-sm text-ok">✓ Guardado</span>}
          </div>
        </form>

        <div className="space-y-4 rounded-3xl border border-linea bg-panel p-5">
          <h2 className="font-display text-xl font-semibold">Impresora</h2>
          <Campo etiqueta="Ancho del papel" ayuda="Se guarda en este dispositivo: depende de la impresora que tenga vinculada." grupo>
            <div className="grid grid-cols-2 gap-2">
              {PAPELES.map((papel) => (
                <button
                  key={papel.mm}
                  type="button"
                  onClick={() => elegirPapel(papel.columnas)}
                  className={`rounded-xl border py-2 font-medium ${
                    columnas === papel.columnas ? 'border-tinta bg-tinta text-fondo' : 'border-borde text-tenue'
                  }`}
                >
                  {papel.mm} mm
                </button>
              ))}
            </div>
          </Campo>
          <button type="button" onClick={() => imprimir(lineas)} className="w-full rounded-xl border border-tinta py-2.5 font-semibold text-tinta hover:bg-elevado">
            🖨️ Imprimir prueba
          </button>
          <div className="text-sm text-tenue">
            <p className="font-medium text-tinta">Para conectar la impresora (una sola vez):</p>
            <ol className="mt-1 list-decimal space-y-1 pl-5">
              <li>Instalar “RawBT print service” desde Play Store.</li>
              <li>Vincular la impresora en Ajustes de Android → Bluetooth. Si pide PIN, probar 0000 o 1234.</li>
              <li>En RawBT, elegir esa impresora y el mismo ancho de papel que acá.</li>
              <li>Tocar “Imprimir prueba”. La primera vez Chrome pregunta con qué abrirlo: elegir RawBT y “Siempre”.</li>
            </ol>
          </div>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-tenue">Vista previa (venta de ejemplo)</p>
        <div className="overflow-x-auto rounded-xl bg-elevado py-5">
          <VistaTicket lineas={lineas} columnas={columnas} />
        </div>
      </div>
    </div>
  )
}

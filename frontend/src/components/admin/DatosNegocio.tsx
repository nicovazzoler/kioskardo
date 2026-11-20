import { useState, type FormEvent } from 'react'
import { leerColumnas } from '../../lib/impresora'
import { botonPrimario, claseInput } from '../../lib/estilos'
import { guardarKiosko } from '../../lib/kiosko'
import type { Kiosko, KioskoGuardar } from '../../lib/modelos'
import { armarTicket } from '../../lib/ticket'
import { VENTA_DE_EJEMPLO } from '../../lib/ventaDeEjemplo'
import { Campo } from '../Campos'
import { VistaTicket } from '../ticket/VistaTicket'

export function DatosNegocio({ kiosko }: { kiosko: Kiosko }) {
  const [campos, setCampos] = useState({
    nombre: kiosko.nombre,
    direccion: kiosko.direccion ?? '',
    telefono: kiosko.telefono ?? '',
    pie: kiosko.pie_ticket ?? '',
  })
  const [columnas] = useState(leerColumnas)
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

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
      <form onSubmit={guardar} className="max-w-md space-y-4" noValidate>
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Datos del negocio</h1>
          <p className="mt-1 text-sm text-tenue">Salen arriba y abajo de cada ticket.</p>
        </div>
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
          <button type="submit" className={`${botonPrimario} px-6 py-2.5`}>
            Guardar
          </button>
          {estado === 'guardado' && <span className="text-sm font-semibold text-ok">Guardado</span>}
        </div>
      </form>

      <div>
        <p className="mb-2 text-sm font-medium text-tenue">Vista previa (venta de ejemplo)</p>
        <div className="overflow-x-auto rounded-sm bg-elevado py-5">
          <VistaTicket lineas={lineas} columnas={columnas} />
        </div>
      </div>
    </div>
  )
}

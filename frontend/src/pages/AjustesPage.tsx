import { useState } from 'react'
import { Link } from 'react-router'
import { Campo } from '../components/Campos'
import { IconoCamara, IconoPantalla } from '../components/Iconos'
import { VistaTicket } from '../components/ticket/VistaTicket'
import { camaraDisponible } from '../lib/camara'
import { claseOpcion } from '../lib/estilos'
import { guardarColumnas, imprimir, leerColumnas, PAPELES } from '../lib/impresora'
import { useKiosko } from '../lib/kiosko'
import { armarTicket } from '../lib/ticket'
import { VENTA_DE_EJEMPLO } from '../lib/ventaDeEjemplo'

// Lo que depende de este dispositivo. Lo del negocio (datos del ticket, empleados, código) está en Admin.
export function AjustesPage() {
  return (
    <section className="mx-auto max-w-5xl p-4 md:p-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Ajustes</h1>
      <p className="mt-1 text-sm text-tenue">De este dispositivo. Los datos del ticket se cambian en Admin.</p>
      <Impresora />
      <OtrosDispositivos />
    </section>
  )
}

function OtrosDispositivos() {
  return (
    <div className="mt-8 space-y-3 border-t border-linea pt-5">
      <div>
        <h2 className="font-display text-xl font-semibold tracking-tight">Usar este dispositivo como…</h2>
        <p className="mt-1 text-sm text-tenue">Se conecta en vivo con la caja abierta en la tablet. Los dos necesitan internet.</p>
      </div>
      <div className="grid sm:grid-cols-2 sm:gap-x-8">
        <Link to="/pantalla" className="flex gap-3 border-b border-linea py-3 text-tinta hover:text-ambar">
          <IconoPantalla tamano={24} />
          <span>
            <span className="block font-semibold">Pantalla del cliente</span>
            <span className="block text-sm text-tenue">Muestra lo que se va cobrando, el total y el vuelto.</span>
          </span>
        </Link>
        {camaraDisponible ? (
          <Link to="/escaner" className="flex gap-3 border-b border-linea py-3 text-tinta hover:text-ambar">
            <IconoCamara tamano={24} />
            <span>
              <span className="block font-semibold">Escáner para la caja</span>
              <span className="block text-sm text-tenue">Lee códigos con la cámara y los suma a la venta de la tablet.</span>
            </span>
          </Link>
        ) : (
          <div className="flex gap-3 border-b border-linea py-3 text-apagado">
            <IconoCamara tamano={24} />
            <span>
              <span className="block font-semibold">Escáner para la caja</span>
              <span className="block text-sm">Necesita Chrome en Android.</span>
            </span>
          </div>
        )}
      </div>
      <p className="text-xs text-tenue">Con la app instalada, también aparecen al mantener apretado su ícono.</p>
    </div>
  )
}

function Impresora() {
  const kiosko = useKiosko()
  const [columnas, setColumnas] = useState(leerColumnas)
  const lineas = armarTicket(VENTA_DE_EJEMPLO, kiosko ?? { nombre: 'Nombre del negocio', direccion: null, telefono: null, pie_ticket: null }, columnas)

  const elegirPapel = (nuevas: number) => {
    setColumnas(nuevas)
    guardarColumnas(nuevas)
  }

  return (
    <div className="mt-5 grid gap-8 border-t border-linea pt-5 md:grid-cols-[1fr_auto] md:items-start">
      <div className="space-y-4">
        <h2 className="font-display text-xl font-semibold tracking-tight">Impresora</h2>
        <Campo etiqueta="Ancho del papel" ayuda="Depende de la impresora que tenga vinculada este dispositivo." grupo>
          <div className="flex gap-6 border-b border-linea">
            {PAPELES.map((papel) => (
              <button
                key={papel.mm}
                type="button"
                onClick={() => elegirPapel(papel.columnas)}
                aria-pressed={columnas === papel.columnas}
                className={`h-11 ${claseOpcion(columnas === papel.columnas)}`}
              >
                {papel.mm} mm
              </button>
            ))}
          </div>
        </Campo>
        <button type="button" onClick={() => imprimir(lineas)} className="-ml-2 rounded-md px-2 py-2.5 font-semibold text-ambar hover:bg-elevado">
          Imprimir prueba
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

      <div>
        <p className="mb-2 text-sm font-medium text-tenue">Vista previa (venta de ejemplo)</p>
        <div className="overflow-x-auto rounded-sm bg-elevado py-5">
          <VistaTicket lineas={lineas} columnas={columnas} />
        </div>
      </div>
    </div>
  )
}

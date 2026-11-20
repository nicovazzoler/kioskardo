import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { DetalleResumen } from '../components/caja/DetalleResumen'
import { ListaMovimientos } from '../components/caja/ListaMovimientos'
import { ListaVentas } from '../components/caja/ListaVentas'
import { ModalCierre } from '../components/caja/ModalCierre'
import { ModalMovimiento } from '../components/caja/ModalMovimiento'
import { ResultadoCierre } from '../components/caja/ResultadoCierre'
import { EnElTurno } from '../components/turnos/EnElTurno'
import { AbrirCaja } from '../components/venta/AbrirCaja'
import { useAhora } from '../hooks/useAhora'
import { cerrarCaja, useCajaAbierta } from '../lib/cajas'
import { db } from '../lib/db'
import { formatearDia, formatearDuracion, formatearHora, minutosEntre } from '../lib/fechas'
import type { Caja, Presencia, ResumenCaja, TipoMovimientoCaja } from '../lib/modelos'
import { calcularResumen } from '../lib/resumenCaja'
import { botonPrimario, botonSecundario, claseOpcion } from '../lib/estilos'

export function CajaPage() {
  const caja = useCajaAbierta()
  // Al cerrar, la caja deja de estar abierta; se guarda una foto para mostrar el resultado.
  const [cierre, setCierre] = useState<Cierre | null>(null)

  if (cierre) return <ResultadoCierre {...cierre} alTerminar={() => setCierre(null)} />
  if (caja === undefined) return null
  if (caja === null) return <AbrirCaja />
  return <CajaAbierta caja={caja} alCerrar={setCierre} />
}

interface Cierre {
  caja: Caja
  resumen: ResumenCaja
  presencias: Presencia[]
}

type Pestania = 'ventas' | 'movimientos'

interface Props {
  caja: Caja
  alCerrar: (cierre: Cierre) => void
}

function CajaAbierta({ caja, alCerrar }: Props) {
  const ventas = useLiveQuery(() => db.ventas.where('caja_id').equals(caja.id).reverse().sortBy('creado_en'), [caja.id])
  const movimientos = useLiveQuery(() => db.movimientosCaja.where('caja_id').equals(caja.id).reverse().sortBy('creado_en'), [caja.id])
  const [pestania, setPestania] = useState<Pestania>('ventas')
  const [modal, setModal] = useState<TipoMovimientoCaja | 'cierre' | null>(null)
  const ahora = useAhora()

  if (!ventas || !movimientos) return null
  const resumen = calcularResumen(caja, ventas, movimientos)

  const cerrar = async (montoContado: number, nota: string | null) => {
    const cerrada = await cerrarCaja(caja, montoContado, nota)
    const presencias = await db.presencias.where('caja_id').equals(caja.id).sortBy('entrada')
    alCerrar({ caja: cerrada, resumen, presencias })
  }

  return (
    <section className="mx-auto max-w-5xl p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Caja</h1>
          <p className="text-sm text-tenue">
            Turno abierto el {formatearDia(caja.abierta_en)} a las {formatearHora(caja.abierta_en)} · lleva {formatearDuracion(minutosEntre(caja.abierta_en, ahora))}
          </p>
        </div>
        <div className="flex w-full gap-1 text-sm md:w-auto">
          <button onClick={() => setModal('ingreso')} className={`${botonSecundario} h-11 flex-1 px-3 md:flex-none`}>
            + Ingreso
          </button>
          <button onClick={() => setModal('egreso')} className={`${botonSecundario} h-11 flex-1 px-3 md:flex-none`}>
            − Egreso
          </button>
          <button onClick={() => setModal('cierre')} className={`${botonPrimario} ml-1 h-11 flex-1 px-5 whitespace-nowrap md:flex-none`}>
            Cerrar turno
          </button>
        </div>
      </div>

      <EnElTurno cajaId={caja.id} />

      <div className="mt-5">
        <DetalleResumen montoInicial={caja.monto_inicial} resumen={resumen} />
      </div>

      <div className="mt-6 flex gap-6 border-b border-linea">
        {(['ventas', 'movimientos'] as const).map((p) => (
          <button key={p} onClick={() => setPestania(p)} aria-pressed={pestania === p} className={`h-11 text-sm ${claseOpcion(pestania === p)}`}>
            {p === 'ventas' ? 'Ventas' : 'Ingresos y egresos'} <span className="font-normal text-tenue tabular-nums">{p === 'ventas' ? ventas.length : movimientos.length}</span>
          </button>
        ))}
      </div>
      <div>{pestania === 'ventas' ? <ListaVentas ventas={ventas} /> : <ListaMovimientos movimientos={movimientos} />}</div>

      {(modal === 'ingreso' || modal === 'egreso') && <ModalMovimiento cajaId={caja.id} tipo={modal} alCerrar={() => setModal(null)} />}
      {modal === 'cierre' && <ModalCierre esperado={resumen.efectivo_esperado} alCerrar={() => setModal(null)} alConfirmar={cerrar} />}
    </section>
  )
}

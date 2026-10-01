import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { DetalleResumen } from '../components/caja/DetalleResumen'
import { HistorialCierres } from '../components/caja/HistorialCierres'
import { ListaMovimientos } from '../components/caja/ListaMovimientos'
import { ListaVentas } from '../components/caja/ListaVentas'
import { ModalCierre } from '../components/caja/ModalCierre'
import { ModalMovimiento } from '../components/caja/ModalMovimiento'
import { ResultadoCierre } from '../components/caja/ResultadoCierre'
import { AbrirCaja } from '../components/venta/AbrirCaja'
import { cerrarCaja, useCajaAbierta } from '../lib/cajas'
import { db } from '../lib/db'
import { formatearFechaHora } from '../lib/fechas'
import type { Caja, ResumenCaja, TipoMovimientoCaja } from '../lib/modelos'
import { calcularResumen } from '../lib/resumenCaja'

export function CajaPage() {
  const caja = useCajaAbierta()
  // Al cerrar, la caja deja de estar abierta; se guarda una foto para mostrar el resultado.
  const [cierre, setCierre] = useState<{ caja: Caja; resumen: ResumenCaja } | null>(null)

  if (cierre) return <ResultadoCierre caja={cierre.caja} resumen={cierre.resumen} alTerminar={() => setCierre(null)} />
  if (caja === undefined) return null
  if (caja === null) {
    return (
      <section className="mx-auto max-w-4xl p-4 md:p-6">
        <AbrirCaja />
        <HistorialCierres />
      </section>
    )
  }
  return <CajaAbierta caja={caja} alCerrar={(cerrada, resumen) => setCierre({ caja: cerrada, resumen })} />
}

type Pestania = 'ventas' | 'movimientos'

interface Props {
  caja: Caja
  alCerrar: (cerrada: Caja, resumen: ResumenCaja) => void
}

function CajaAbierta({ caja, alCerrar }: Props) {
  const ventas = useLiveQuery(() => db.ventas.where('caja_id').equals(caja.id).reverse().sortBy('creado_en'), [caja.id])
  const movimientos = useLiveQuery(() => db.movimientosCaja.where('caja_id').equals(caja.id).reverse().sortBy('creado_en'), [caja.id])
  const [pestania, setPestania] = useState<Pestania>('ventas')
  const [modal, setModal] = useState<TipoMovimientoCaja | 'cierre' | null>(null)

  if (!ventas || !movimientos) return null
  const resumen = calcularResumen(caja, ventas, movimientos)

  const cerrar = async (montoContado: number, nota: string | null) => {
    const cerrada = await cerrarCaja(caja, montoContado, nota)
    alCerrar(cerrada, resumen)
  }

  return (
    <section className="mx-auto max-w-5xl p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Caja</h1>
          <p className="text-sm text-slate-500">Abierta desde {formatearFechaHora(caja.abierta_en)}</p>
        </div>
        <div className="flex w-full gap-2 text-sm md:w-auto md:text-base">
          <button onClick={() => setModal('ingreso')} className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 md:flex-none">
            + Ingreso
          </button>
          <button onClick={() => setModal('egreso')} className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 md:flex-none">
            − Egreso
          </button>
          <button onClick={() => setModal('cierre')} className="flex-1 whitespace-nowrap rounded-lg bg-marca-700 px-4 py-2.5 font-semibold text-white md:flex-none">
            Cerrar caja
          </button>
        </div>
      </div>

      <div className="mt-5">
        <DetalleResumen montoInicial={caja.monto_inicial} resumen={resumen} />
      </div>

      <div className="mt-6 flex gap-2">
        {(['ventas', 'movimientos'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPestania(p)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${pestania === p ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}
          >
            {p === 'ventas' ? `Ventas (${ventas.length})` : `Ingresos y egresos (${movimientos.length})`}
          </button>
        ))}
      </div>
      <div className="mt-3">{pestania === 'ventas' ? <ListaVentas ventas={ventas} /> : <ListaMovimientos movimientos={movimientos} />}</div>

      {(modal === 'ingreso' || modal === 'egreso') && <ModalMovimiento cajaId={caja.id} tipo={modal} alCerrar={() => setModal(null)} />}
      {modal === 'cierre' && <ModalCierre esperado={resumen.efectivo_esperado} alCerrar={() => setModal(null)} alConfirmar={cerrar} />}
    </section>
  )
}

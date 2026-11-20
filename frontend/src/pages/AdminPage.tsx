import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { CambiarCodigo } from '../components/admin/CambiarCodigo'
import { DatosNegocio } from '../components/admin/DatosNegocio'
import { ListaEmpleados } from '../components/admin/ListaEmpleados'
import { TecladoCodigo } from '../components/admin/TecladoCodigo'
import { TurnosYHoras } from '../components/admin/TurnosYHoras'
import { cambiarDesbloqueo, codigoCorrecto, useAdminDesbloqueado } from '../lib/codigoAdmin'
import { claseOpcion, rotulo } from '../lib/estilos'
import { useKiosko } from '../lib/kiosko'
import type { Kiosko } from '../lib/modelos'

const SECCIONES = [
  { clave: 'turnos', nombre: 'Turnos y horas', corto: 'Turnos' },
  { clave: 'empleados', nombre: 'Empleados', corto: 'Empleados' },
  { clave: 'negocio', nombre: 'Datos del negocio', corto: 'Negocio' },
  { clave: 'codigo', nombre: 'Código de admin', corto: 'Código' },
] as const

type Seccion = (typeof SECCIONES)[number]['clave']

export function AdminPage() {
  const kiosko = useKiosko()
  const desbloqueado = useAdminDesbloqueado()

  // Al salir de Admin se vuelve a pedir el código.
  useEffect(() => () => cambiarDesbloqueo(false), [])

  if (kiosko === undefined) {
    return <p className="p-6 text-ambar">Los datos del negocio se cargan la primera vez que la app se conecta al servidor. Revisá la conexión.</p>
  }
  if (kiosko.codigo_admin_hash && !desbloqueado) return <PedirCodigo kiosko={kiosko} />
  return <PanelAdmin kiosko={kiosko} />
}

function PedirCodigo({ kiosko }: { kiosko: Kiosko }) {
  return (
    <section className="flex min-h-full flex-col items-center justify-center gap-6 p-6">
      <div className="text-center">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Admin</h1>
        <p className="mt-1.5 text-tenue">Ingresá el código del dueño</p>
      </div>
      <TecladoCodigo
        alCompletar={async (codigo) => {
          const correcto = await codigoCorrecto(kiosko, codigo)
          if (correcto) cambiarDesbloqueo(true)
          return correcto
        }}
      />
      <p className="max-w-sm text-center text-sm text-apagado">El mismo código se pide para anular una venta o cambiar un precio.</p>
    </section>
  )
}

function PanelAdmin({ kiosko }: { kiosko: Kiosko }) {
  const [seccion, setSeccion] = useState<Seccion>('turnos')
  const navegar = useNavigate()

  const salir = () => {
    cambiarDesbloqueo(false)
    navegar('/')
  }

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-6 p-4 md:flex-row md:gap-8 md:p-6">
      <nav aria-label="Secciones de admin" className="md:w-44 md:shrink-0">
        <p className={`${rotulo} hidden pt-3 pb-2.5 text-apagado md:block`}>Admin</p>
        <ul className="flex gap-5 overflow-x-auto border-b border-linea md:block md:border-b-0">
          {SECCIONES.map(({ clave, nombre, corto }) => (
            <li key={clave} className="shrink-0 md:border-t md:border-linea md:last:border-b">
              <button
                onClick={() => setSeccion(clave)}
                aria-current={seccion === clave}
                className={`h-11 text-sm whitespace-nowrap md:w-full md:text-left ${
                  seccion === clave ? `${claseOpcion(true)} md:font-bold md:shadow-none` : 'text-tinta-suave hover:text-tinta'
                }`}
              >
                <span className="md:hidden">{corto}</span>
                <span className="hidden md:inline">{nombre}</span>
              </button>
            </li>
          ))}
        </ul>
        <button onClick={salir} className="mt-3 hidden h-10 text-sm text-tenue underline underline-offset-4 hover:text-tinta md:block">
          Salir de admin
        </button>
      </nav>

      <div className="min-w-0 flex-1">
        {!kiosko.codigo_admin_hash && seccion !== 'codigo' && (
          <p className="mb-6 border-l-2 border-ambar py-1 pl-3 text-sm text-tinta-suave">
            Admin está abierto: cualquiera puede entrar, anular ventas y cambiar precios.{' '}
            <button onClick={() => setSeccion('codigo')} className="font-semibold text-ambar hover:text-tinta">
              Poner un código
            </button>
          </p>
        )}
        {seccion === 'turnos' && <TurnosYHoras />}
        {seccion === 'empleados' && <ListaEmpleados />}
        {seccion === 'negocio' && <DatosNegocio kiosko={kiosko} />}
        {seccion === 'codigo' && <CambiarCodigo kiosko={kiosko} />}
      </div>
    </section>
  )
}

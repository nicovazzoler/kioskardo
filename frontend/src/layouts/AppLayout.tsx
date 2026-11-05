import { NavLink, Outlet } from 'react-router'
import { EstadoConexion } from '../components/EstadoConexion'

const SECCIONES = [
  { ruta: '/', nombre: 'Venta', icono: '🛒' },
  { ruta: '/inventario', nombre: 'Inventario', icono: '📦' },
  { ruta: '/caja', nombre: 'Caja', icono: '💵' },
]

// Celular: barra de navegación abajo, al alcance del pulgar.
// Tablet/PC (md en adelante): barra lateral fija a la izquierda.
export function AppLayout() {
  return (
    <div className="flex h-full flex-col md:flex-row">
      <nav className="order-last flex shrink-0 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:order-first md:w-56 md:flex-col md:border-t-0 md:border-r md:pb-0">
        <div className="hidden items-center gap-2 px-5 py-5 text-lg font-bold text-marca-700 md:flex">
          <img src="/logo.svg" alt="" className="h-8 w-8" />
          Kioskardo
        </div>
        {SECCIONES.map((seccion) => (
          <NavLink
            key={seccion.ruta}
            to={seccion.ruta}
            end={seccion.ruta === '/'}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium md:mx-3 md:flex-none md:flex-row md:gap-3 md:rounded-lg md:px-3 md:py-3 md:text-base ${
                isActive ? 'text-marca-700 md:bg-marca-50' : 'text-slate-500 hover:text-slate-800'
              }`
            }
          >
            <span className="text-2xl md:text-xl">{seccion.icono}</span>
            {seccion.nombre}
          </NavLink>
        ))}
        <a
          href="/pantalla"
          target="_blank"
          className="mx-3 mt-auto mb-4 hidden rounded-lg border border-slate-200 px-3 py-2 text-center text-sm text-slate-600 hover:bg-slate-50 md:block"
        >
          Abrir pantalla cliente ↗
        </a>
      </nav>

      <div className="flex min-h-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:px-6">
          <span className="font-semibold md:hidden">Kioskardo</span>
          <span className="ml-auto">
            <EstadoConexion />
          </span>
        </header>
        {/* Sin padding: cada página decide el suyo (la venta usa todo el alto y ancho). */}
        <main className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

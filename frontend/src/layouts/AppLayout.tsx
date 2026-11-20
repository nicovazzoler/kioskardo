import { NavLink, Outlet } from 'react-router'
import { EstadoConexion } from '../components/EstadoConexion'
import { IconoAjustes, IconoCaja, IconoInventario, IconoPantalla, IconoVenta } from '../components/Iconos'
import { IngresoClave } from '../components/IngresoClave'
import { useNecesitaClave } from '../lib/sesion'

const SECCIONES = [
  { ruta: '/', nombre: 'Venta', Icono: IconoVenta },
  { ruta: '/inventario', nombre: 'Inventario', Icono: IconoInventario },
  { ruta: '/caja', nombre: 'Caja', Icono: IconoCaja },
  { ruta: '/ajustes', nombre: 'Ajustes', Icono: IconoAjustes },
]

// Celular: barra de navegación abajo, al alcance del pulgar.
// Tablet/PC (md en adelante): barra lateral fija a la izquierda.
export function AppLayout() {
  const necesitaClave = useNecesitaClave()

  return (
    <div className="flex h-full flex-col md:flex-row">
      <nav className="order-last flex shrink-0 border-t border-linea bg-lateral pb-[env(safe-area-inset-bottom)] md:order-first md:w-52 md:flex-col md:gap-1 md:border-t-0 md:border-r md:px-4 md:py-5">
        <div className="hidden items-center gap-2.5 px-2 pb-5 md:flex">
          <img src="/logo.svg" alt="" className="h-9 w-9" />
          <span className="font-display text-xl font-semibold">Kioskardo</span>
        </div>
        {SECCIONES.map(({ ruta, nombre, Icono }) => (
          <NavLink
            key={ruta}
            to={ruta}
            end={ruta === '/'}
            className={({ isActive }) =>
              `group flex flex-1 flex-col items-center gap-1 py-2 text-xs md:flex-none md:flex-row md:gap-3 md:rounded-xl md:px-3 md:py-2.5 md:text-[15px] ${
                isActive ? 'font-semibold text-tinta md:bg-elevado' : 'text-tenue hover:text-tinta'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={isActive ? 'text-ambar' : ''}>
                  <Icono tamano={22} />
                </span>
                {nombre}
              </>
            )}
          </NavLink>
        ))}
        <div className="mt-auto hidden flex-col gap-3 md:flex">
          <a href="/pantalla" target="_blank" className="flex items-center gap-2.5 rounded-xl border border-borde px-3 py-2.5 text-sm hover:bg-elevado">
            <IconoPantalla tamano={18} />
            Pantalla del cliente
          </a>
          <div className="px-2">
            <EstadoConexion />
          </div>
        </div>
      </nav>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-linea px-4 py-3 md:hidden">
          <span className="flex items-center gap-2 font-display text-lg font-semibold">
            <img src="/logo.svg" alt="" className="h-7 w-7" />
            Kioskardo
          </span>
          <EstadoConexion />
        </header>
        {/* Sin padding: cada página decide el suyo (la venta usa todo el alto y ancho). */}
        <main className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      {necesitaClave && <IngresoClave />}
    </div>
  )
}

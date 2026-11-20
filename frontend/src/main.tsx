import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import './index.css'
import { AppLayout } from './layouts/AppLayout'
import { SinMenuLayout } from './layouts/SinMenuLayout'
import { AjustesPage } from './pages/AjustesPage'
import { iniciarSincronizacion } from './lib/sincronizacion'
import { CajaPage } from './pages/CajaPage'
import { EscanerPage } from './pages/EscanerPage'
import { InventarioPage } from './pages/InventarioPage'
import { PantallaClientePage } from './pages/PantallaClientePage'
import { VentaPage } from './pages/VentaPage'

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <VentaPage /> },
      { path: '/inventario', element: <InventarioPage /> },
      { path: '/caja', element: <CajaPage /> },
      { path: '/ajustes', element: <AjustesPage /> },
    ],
  },
  // Van en otro dispositivo, a pantalla completa: sin menú.
  {
    element: <SinMenuLayout />,
    children: [
      { path: '/pantalla', element: <PantallaClientePage /> },
      { path: '/escaner', element: <EscanerPage /> },
    ],
  },
])

iniciarSincronizacion()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)

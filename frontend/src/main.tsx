import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import './index.css'
import { AppLayout } from './layouts/AppLayout'
import { CajaPage } from './pages/CajaPage'
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
    ],
  },
  // Fuera del layout: la pantalla del cliente no lleva menú.
  { path: '/pantalla', element: <PantallaClientePage /> },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)

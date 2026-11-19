import type { ReactNode } from 'react'

export interface PropsIcono {
  tamano?: number
}

// Íconos de trazo: toman el color del texto que los rodea.
export function Icono({ tamano = 20, children }: PropsIcono & { children: ReactNode }) {
  return (
    <svg aria-hidden="true" width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
}

export const IconoVenta = (p: PropsIcono) => (
  <Icono {...p}>
    <path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 8H6.2" />
    <circle cx="9" cy="20" r="1.3" />
    <circle cx="17" cy="20" r="1.3" />
  </Icono>
)

export const IconoInventario = (p: PropsIcono) => (
  <Icono {...p}>
    <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z" />
    <path d="M3 7.5 12 12l9-4.5M12 12v9" />
  </Icono>
)

export const IconoCaja = (p: PropsIcono) => (
  <Icono {...p}>
    <rect x="2.5" y="6" width="19" height="12" rx="2" />
    <circle cx="12" cy="12" r="2.6" />
    <path d="M6 9.5v5M18 9.5v5" />
  </Icono>
)

export const IconoAjustes = (p: PropsIcono) => (
  <Icono {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" />
  </Icono>
)

export const IconoBuscar = (p: PropsIcono) => (
  <Icono {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </Icono>
)

export const IconoCamara = (p: PropsIcono) => (
  <Icono {...p}>
    <path d="M4 8h3l1.6-2.5h6.8L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
    <circle cx="12" cy="13" r="3.5" />
  </Icono>
)

export const IconoBasura = (p: PropsIcono) => (
  <Icono {...p}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </Icono>
)

export const IconoRecibo = (p: PropsIcono) => (
  <Icono {...p}>
    <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
    <path d="M9 8h6M9 12h6" />
  </Icono>
)

export const IconoPantalla = (p: PropsIcono) => (
  <Icono {...p}>
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M8 20h8M12 16v4" />
  </Icono>
)

export const IconoPesos = (p: PropsIcono) => (
  <Icono {...p}>
    <path d="M12 3v18M16.5 7.5c0-1.9-2-3-4.5-3s-4.5 1.2-4.5 3.1c0 4.4 9 2.4 9 6.8 0 2-2 3.1-4.5 3.1s-4.5-1.1-4.5-3" />
  </Icono>
)

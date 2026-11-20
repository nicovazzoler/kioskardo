import type { ReactNode } from 'react'
import type { Categoria, MedioPago } from '../lib/modelos'
import { Icono, type PropsIcono } from './Iconos'

export const ICONOS_CATEGORIA: Record<Categoria, (p: PropsIcono) => ReactNode> = {
  bebidas: (p) => (
    <Icono {...p}>
      <path d="M10 2.5h4M10.5 2.5v3.2L8.6 8.4A3 3 0 0 0 8 10.2V20a1.5 1.5 0 0 0 1.5 1.5h5A1.5 1.5 0 0 0 16 20v-9.8a3 3 0 0 0-.6-1.8l-1.9-2.7V2.5" />
      <path d="M8 13h8" />
    </Icono>
  ),
  golosinas: (p) => (
    <Icono {...p}>
      <ellipse cx="12" cy="12" rx="4.5" ry="3.5" />
      <path d="M7.5 12 3 9v6zM16.5 12 21 9v6z" />
    </Icono>
  ),
  snacks: (p) => (
    <Icono {...p}>
      <path d="M6 3h12l-1 3 1 15H6L7 6z" />
      <path d="M7 6h10M10 11c1 1.2 3 1.2 4 0" />
    </Icono>
  ),
  cigarrillos: (p) => (
    <Icono {...p}>
      <rect x="2.5" y="13" width="15" height="4" rx="1" />
      <path d="M13 13v4M20 13v4M20 10c0-2-1.5-2-1.5-4s1.5-2 1.5-3" />
    </Icono>
  ),
  almacen: (p) => (
    <Icono {...p}>
      <path d="M3 9h18l-1.6 10.2a1.5 1.5 0 0 1-1.5 1.3H6.1a1.5 1.5 0 0 1-1.5-1.3z" />
      <path d="m8 9 3-5M16 9l-3-5M9 13v4M15 13v4M12 13v4" />
    </Icono>
  ),
  lacteos: (p) => (
    <Icono {...p}>
      <path d="M8 2.5h8v3l2 3V21H6V8.5l2-3z" />
      <path d="M6 8.5h12M10 13h4" />
    </Icono>
  ),
  fiambreria: (p) => (
    <Icono {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="14" cy="10" r="1" />
    </Icono>
  ),
  otros: (p) => (
    <Icono {...p}>
      <circle cx="6" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="18" cy="12" r="1.5" />
    </Icono>
  ),
}

export const ICONOS_MEDIO: Record<MedioPago, (p: PropsIcono) => ReactNode> = {
  efectivo: (p) => (
    <Icono {...p}>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.6" />
    </Icono>
  ),
  debito: (p) => (
    <Icono {...p}>
      <rect x="2.5" y="5.5" width="19" height="13" rx="2" />
      <path d="M2.5 10h19M6 15h4" />
    </Icono>
  ),
  credito: (p) => (
    <Icono {...p}>
      <rect x="2.5" y="5.5" width="19" height="13" rx="2" />
      <path d="M2.5 10h19M15 15h3" />
    </Icono>
  ),
  transferencia: (p) => (
    <Icono {...p}>
      <path d="M3 9.5 12 4l9 5.5M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18" />
    </Icono>
  ),
  qr: (p) => (
    <Icono {...p}>
      <rect x="3.5" y="3.5" width="6" height="6" rx="1" />
      <rect x="14.5" y="3.5" width="6" height="6" rx="1" />
      <rect x="3.5" y="14.5" width="6" height="6" rx="1" />
      <path d="M14.5 14.5h2.5v2.5M20.5 14.5v6h-3" />
    </Icono>
  ),
}

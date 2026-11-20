import type { Categoria } from './modelos'

// Los colores son clases de Tailwind escritas enteras: Tailwind solo genera las clases que encuentra así.
export const CATEGORIAS: { valor: Categoria; nombre: string; color: string; texto: string }[] = [
  { valor: 'bebidas', nombre: 'Bebidas', color: 'bg-salvia', texto: 'text-salvia' },
  { valor: 'golosinas', nombre: 'Golosinas', color: 'bg-rosa', texto: 'text-rosa' },
  { valor: 'snacks', nombre: 'Snacks', color: 'bg-manteca', texto: 'text-manteca' },
  { valor: 'cigarrillos', nombre: 'Cigarrillos', color: 'bg-lavanda', texto: 'text-lavanda' },
  { valor: 'almacen', nombre: 'Almacén', color: 'bg-damasco', texto: 'text-damasco' },
  { valor: 'lacteos', nombre: 'Lácteos', color: 'bg-celeste', texto: 'text-celeste' },
  { valor: 'fiambreria', nombre: 'Fiambrería', color: 'bg-durazno', texto: 'text-durazno' },
  { valor: 'otros', nombre: 'Otros', color: 'bg-arena', texto: 'text-arena' },
]

export function datosCategoria(valor: Categoria | null | undefined) {
  return CATEGORIAS.find((c) => c.valor === valor) ?? null
}

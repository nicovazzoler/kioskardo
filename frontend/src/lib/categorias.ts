import type { Categoria } from './modelos'

// El color es una clase de Tailwind escrita entera: Tailwind solo genera las clases que encuentra así.
export const CATEGORIAS: { valor: Categoria; nombre: string; color: string; borde: string }[] = [
  { valor: 'bebidas', nombre: 'Bebidas', color: 'bg-salvia', borde: 'border-salvia' },
  { valor: 'golosinas', nombre: 'Golosinas', color: 'bg-rosa', borde: 'border-rosa' },
  { valor: 'snacks', nombre: 'Snacks', color: 'bg-manteca', borde: 'border-manteca' },
  { valor: 'cigarrillos', nombre: 'Cigarrillos', color: 'bg-lavanda', borde: 'border-lavanda' },
  { valor: 'almacen', nombre: 'Almacén', color: 'bg-damasco', borde: 'border-damasco' },
  { valor: 'lacteos', nombre: 'Lácteos', color: 'bg-celeste', borde: 'border-celeste' },
  { valor: 'fiambreria', nombre: 'Fiambrería', color: 'bg-durazno', borde: 'border-durazno' },
  { valor: 'otros', nombre: 'Otros', color: 'bg-arena', borde: 'border-arena' },
]

export function datosCategoria(valor: Categoria | null | undefined) {
  return CATEGORIAS.find((c) => c.valor === valor) ?? null
}

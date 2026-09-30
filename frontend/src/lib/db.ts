import { Dexie, type EntityTable } from 'dexie'
import type { Producto } from './modelos'

// Una request a la API que todavía no llegó al servidor.
export interface Pendiente {
  seq?: number
  metodo: 'PUT' | 'POST'
  ruta: string
  cuerpo: unknown
  creado_en: string
  // Si el servidor la rechazó (4xx), queda acá con el motivo en vez de reintentarse para siempre.
  error?: string
}

export const db = new Dexie('kioskardo') as Dexie & {
  productos: EntityTable<Producto, 'id'>
  pendientes: EntityTable<Pendiente, 'seq'>
}

// Solo se declaran las columnas por las que se busca (índices), no todas.
// "++seq" = autoincremental: mantiene el orden en que se hicieron los cambios.
db.version(1).stores({
  productos: 'id, codigo_barras, nombre',
  pendientes: '++seq',
})

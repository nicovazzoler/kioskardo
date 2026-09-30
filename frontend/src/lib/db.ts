import { Dexie, type EntityTable } from 'dexie'
import type { Caja, Producto, Venta } from './modelos'

// Una request a la API que todavía no llegó al servidor.
export interface Pendiente {
  seq?: number
  metodo: 'PUT' | 'POST'
  ruta: string
  cuerpo: unknown
  // Tabla local donde se guarda lo que responde el servidor.
  destino: 'productos' | 'cajas' | 'ventas'
  creado_en: string
  // Si el servidor la rechazó (4xx), queda acá con el motivo en vez de reintentarse para siempre.
  error?: string
}

export const db = new Dexie('kioskardo') as Dexie & {
  productos: EntityTable<Producto, 'id'>
  pendientes: EntityTable<Pendiente, 'seq'>
  cajas: EntityTable<Caja, 'id'>
  ventas: EntityTable<Venta, 'id'>
}

// Solo se declaran las columnas por las que se busca (índices), no todas.
// "++seq" = autoincremental: mantiene el orden en que se hicieron los cambios.
db.version(1).stores({
  productos: 'id, codigo_barras, nombre',
  pendientes: '++seq',
})
// Cada cambio de esquema es una versión nueva; Dexie migra solo la base que ya existe en el dispositivo.
db.version(2).stores({
  cajas: 'id',
  ventas: 'id, caja_id',
})

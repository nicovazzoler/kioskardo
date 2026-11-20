// Espejo de los modelos del backend (backend/app/modelos.py).
// Montos en centavos, fechas en ISO 8601, ids en UUID generados en el cliente.

export type Unidad = 'unidad' | 'kg'
export type Categoria = 'bebidas' | 'golosinas' | 'snacks' | 'cigarrillos' | 'almacen' | 'lacteos' | 'fiambreria' | 'otros'
export type MotivoStock = 'compra' | 'venta' | 'ajuste' | 'merma'
export type MedioPago = 'efectivo' | 'debito' | 'credito' | 'transferencia' | 'qr'
export type TipoMovimientoCaja = 'ingreso' | 'egreso'

export interface KioskoGuardar {
  nombre: string
  direccion: string | null
  telefono: string | null
  pie_ticket: string | null
}

export interface Kiosko extends KioskoGuardar {
  id: string
  // SHA-256 del código de admin. null: todavía no hay código y Admin queda abierto.
  codigo_admin_hash: string | null
}

export interface Empleado {
  id: string
  nombre: string
  activo: boolean
}

// Un empleado en un turno (una caja): si entra tarde o se va antes, tiene sus propios horarios.
export interface Presencia {
  id: string
  caja_id: string
  empleado_id: string
  entrada: string
  // null mientras sigue en el turno.
  salida: string | null
}

export interface ProductoGuardar {
  codigo_barras: string | null
  nombre: string
  precio_venta: number
  costo: number | null
  unidad: Unidad
  // El precio se tipea al vender (ej: fiambre, con el monto que marca la balanza).
  precio_libre: boolean
  categoria: Categoria | null
  stock_minimo: number
  activo: boolean
}

export interface Producto extends ProductoGuardar {
  id: string
  // Suma de todos los movimientos de stock; lo calcula el backend.
  stock: number
}

export interface MovimientoStockCrear {
  id: string
  // compra y merma: cuánto entra o sale. ajuste: el stock real contado.
  motivo: 'compra' | 'merma' | 'ajuste'
  cantidad: number
}

export interface MovimientoStock {
  id: string
  producto_id: string
  // Con signo: +24 al comprar, -2 al vender. El stock es la suma.
  cantidad: number
  motivo: MotivoStock
  venta_id: string | null
  creado_en: string
}

export interface Caja {
  id: string
  abierta_en: string
  cerrada_en: string | null
  monto_inicial: number
  monto_contado: number | null
  nota: string | null
}

export interface ResumenCaja {
  cantidad_ventas: number
  total_ventas: number
  por_medio: Record<MedioPago, number>
  ingresos: number
  egresos: number
  // Inicial + ventas en efectivo + ingresos - egresos: lo que debería haber en el cajón.
  efectivo_esperado: number
}

export interface CajaConResumen extends Caja {
  resumen: ResumenCaja
  presencias: Presencia[]
}

export interface Venta {
  id: string
  caja_id: string
  total: number
  anulada: boolean
  creado_en: string
  items: VentaItem[]
  pagos: VentaPago[]
}

export interface VentaPago {
  id: string
  medio: MedioPago
  monto: number
  // Solo efectivo: con cuánto pagó el cliente.
  recibido: number | null
}

export interface VentaItem {
  id: string
  // null en los ítems "Varios" (monto libre, sin producto).
  producto_id: string | null
  // Nombre y precio copiados al momento de vender: si mañana cambia el precio, el ticket viejo no cambia.
  nombre: string
  precio_unitario: number
  cantidad: number
  subtotal: number
}

export interface MovimientoCaja {
  id: string
  caja_id: string
  tipo: TipoMovimientoCaja
  monto: number
  motivo: string
  creado_en: string
}

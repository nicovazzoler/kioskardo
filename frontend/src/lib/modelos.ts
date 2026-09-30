// Espejo de los modelos del backend (backend/app/modelos.py).
// Montos en centavos, fechas en ISO 8601, ids en UUID generados en el cliente.

export type Unidad = 'unidad' | 'kg'
export type MotivoStock = 'compra' | 'venta' | 'ajuste' | 'merma'
export type MedioPago = 'efectivo' | 'debito' | 'credito' | 'transferencia' | 'qr'
export type TipoMovimientoCaja = 'ingreso' | 'egreso'

export interface Producto {
  id: string
  kiosko_id: string
  codigo_barras: string | null
  nombre: string
  precio_venta: number
  costo: number | null
  unidad: Unidad
  stock_minimo: number
  activo: boolean
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
}

export interface Venta {
  id: string
  caja_id: string
  total: number
  medio_pago: MedioPago
  anulada: boolean
  creado_en: string
  items: VentaItem[]
}

export interface VentaItem {
  id: string
  producto_id: string
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

import type { Venta } from './modelos'

// Para la vista previa y la impresión de prueba del ticket.
export const VENTA_DE_EJEMPLO: Venta = {
  id: '7f3a91c2-0000-4000-8000-000000000000',
  caja_id: '',
  total: 1070000,
  anulada: false,
  creado_en: new Date().toISOString(),
  items: [
    { id: '1', producto_id: null, nombre: 'Gaseosa cola 500 ml', precio_unitario: 250000, cantidad: 2, subtotal: 500000 },
    { id: '2', producto_id: null, nombre: 'Caramelos surtidos', precio_unitario: 900000, cantidad: 0.25, subtotal: 225000 },
    { id: '3', producto_id: null, nombre: 'Fiambre', precio_unitario: 345000, cantidad: 1, subtotal: 345000 },
  ],
  pagos: [{ id: 'p', medio: 'efectivo', monto: 1070000, recibido: 2000000 }],
}

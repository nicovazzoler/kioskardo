import { formatearCantidad } from './cantidad'
import { formatearPesos } from './dinero'
import { formatearHora } from './fechas'
import { nombreMedio } from './mediosPago'
import type { KioskoGuardar, Venta, VentaItem } from './modelos'

export interface Linea {
  texto: string
  centrado?: boolean
  negrita?: boolean
  grande?: boolean
}

const fecha = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })

// Lo que va impreso, renglón por renglón. La vista previa y la impresora usan esto mismo.
export function armarTicket(venta: Venta, kiosko: KioskoGuardar, columnas: number): Linea[] {
  const separador: Linea = { texto: '-'.repeat(columnas) }
  const simples = (textos: string[]): Linea[] => textos.map((texto) => ({ texto }))
  const centradas = (texto: string): Linea[] => partir(texto, columnas).map((t) => ({ texto: t, centrado: true }))

  return [
    ...partir(kiosko.nombre.toUpperCase(), columnas).map((texto) => ({ texto, centrado: true, negrita: true, grande: true })),
    ...[kiosko.direccion, kiosko.telefono].flatMap((dato) => (dato ? centradas(dato) : [])),
    separador,
    ...simples(fila(`${fecha.format(new Date(venta.creado_en))} ${formatearHora(venta.creado_en)}`, `N° ${numeroTicket(venta)}`, columnas)),
    ...(venta.anulada ? [{ texto: '*** VENTA ANULADA ***', centrado: true, negrita: true }] : []),
    separador,
    ...simples(venta.items.flatMap((item) => renglonesItem(item, columnas))),
    separador,
    ...fila('TOTAL', pesos(venta.total), columnas).map((texto) => ({ texto, negrita: true, grande: true })),
    ...simples(
      venta.pagos.flatMap((pago) => [
        ...fila(nombreMedio(pago.medio), pesos(pago.monto), columnas),
        ...(pago.recibido !== null && pago.recibido > pago.monto
          ? [...fila('  Paga con', pesos(pago.recibido), columnas), ...fila('  Vuelto', pesos(pago.recibido - pago.monto), columnas)]
          : []),
      ]),
    ),
    separador,
    ...centradas(kiosko.pie_ticket ?? '¡Gracias por su compra!'),
    ...centradas('No válido como factura'),
  ]
}

// Las ventas se crean sin conexión, así que no hay un número correlativo: se usa el comienzo del id.
export function numeroTicket(venta: Venta): string {
  return venta.id.slice(0, 8).toUpperCase()
}

function renglonesItem(item: VentaItem, columnas: number): string[] {
  if (item.cantidad === 1) return fila(item.nombre, pesos(item.subtotal), columnas)
  // Mismo criterio que la lista de ventas: el ítem no guarda la unidad, y una cantidad con decimales es peso.
  const detalle = Number.isInteger(item.cantidad)
    ? `  ${item.cantidad} x ${pesos(item.precio_unitario)}`
    : `  ${formatearCantidad(item.cantidad, 'kg')} x ${pesos(item.precio_unitario)}/kg`
  return [...partir(item.nombre, columnas), ...fila(detalle, pesos(item.subtotal), columnas)]
}

// Intl separa "$" del número con un espacio duro, que la impresora no tiene.
function pesos(centavos: number): string {
  return formatearPesos(centavos).replace(/ /g, ' ')
}

// Texto a la izquierda y monto pegado a la derecha. Si no entran juntos, el monto baja al renglón siguiente.
function fila(izquierda: string, derecha: string, columnas: number): string[] {
  const renglones = partir(izquierda, columnas)
  const ultimo = renglones.pop()!
  if (ultimo.length + 1 + derecha.length <= columnas) {
    return [...renglones, ultimo + derecha.padStart(columnas - ultimo.length)]
  }
  return [...renglones, ultimo, derecha.padStart(columnas)]
}

// Corta en palabras sin pasarse de las columnas. Conserva la sangría del comienzo.
export function partir(texto: string, columnas: number): string[] {
  const sangria = texto.match(/^ */)![0]
  const ancho = columnas - sangria.length
  const renglones: string[] = []
  let actual = ''
  for (const palabra of texto.trim().split(/\s+/)) {
    for (const pedazo of palabra.match(new RegExp(`.{1,${ancho}}`, 'g')) ?? ['']) {
      if (!actual) actual = pedazo
      else if (actual.length + 1 + pedazo.length <= ancho) actual += ' ' + pedazo
      else {
        renglones.push(actual)
        actual = pedazo
      }
    }
  }
  renglones.push(actual)
  return renglones.map((r) => sangria + r)
}

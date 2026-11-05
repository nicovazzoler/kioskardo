import { useEffect, useState } from 'react'
import { redondearGramos } from '../lib/cantidad'
import type { Producto, Unidad, VentaItem } from '../lib/modelos'
import { nuevoId } from '../lib/uuid'
import { calcularSubtotal, calcularTotal } from '../lib/ventas'

export interface ItemCarrito extends VentaItem {
  unidad: Unidad
}

const CLAVE = 'kioskardo:carrito'

function leerGuardado(): ItemCarrito[] {
  try {
    return JSON.parse(localStorage.getItem(CLAVE) ?? '[]')
  } catch {
    return []
  }
}

// El carrito se guarda en localStorage: si se recarga la página a mitad de una venta, no se pierde.
export function useCarrito() {
  const [items, setItems] = useState<ItemCarrito[]>(leerGuardado)

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(items))
    } catch {
      // Modo incógnito o almacenamiento lleno: el carrito funciona igual, solo no sobrevive a una recarga.
    }
  }, [items])

  // Escanear dos veces el mismo producto suma 1 a la línea existente en vez de agregar otra.
  const agregarProducto = (producto: Producto) =>
    setItems((actuales) => {
      const existente = actuales.find((i) => i.producto_id === producto.id && i.unidad === 'unidad')
      if (existente) return conCantidad(actuales, existente.id, existente.cantidad + 1)
      return [...actuales, nuevoItem(producto.id, producto.nombre, producto.precio_venta, 1, producto.unidad)]
    })

  // Productos por kg: cada pesada es una línea aparte. El subtotal puede venir fijo ("$500 de caramelos").
  const agregarPesado = (producto: Producto, cantidad: number, subtotal?: number) =>
    setItems((actuales) => [
      ...actuales,
      { ...nuevoItem(producto.id, producto.nombre, producto.precio_venta, cantidad, 'kg'), ...(subtotal !== undefined && { subtotal }) },
    ])

  const agregarVarios = (monto: number, descripcion: string) =>
    setItems((actuales) => [...actuales, nuevoItem(null, descripcion || 'Varios', monto, 1, 'unidad')])

  const cambiarCantidad = (id: string, cantidad: number) =>
    setItems((actuales) => (cantidad <= 0 ? actuales.filter((i) => i.id !== id) : conCantidad(actuales, id, cantidad)))

  const quitar = (id: string) => setItems((actuales) => actuales.filter((i) => i.id !== id))

  const vaciar = () => setItems([])

  return { items, total: calcularTotal(items), agregarProducto, agregarPesado, agregarVarios, cambiarCantidad, quitar, vaciar }
}

function nuevoItem(productoId: string | null, nombre: string, precio: number, cantidad: number, unidad: Unidad): ItemCarrito {
  return {
    id: nuevoId(),
    producto_id: productoId,
    nombre,
    precio_unitario: precio,
    cantidad,
    subtotal: calcularSubtotal(precio, cantidad),
    unidad,
  }
}

function conCantidad(items: ItemCarrito[], id: string, cantidad: number): ItemCarrito[] {
  return items.map((i) =>
    i.id === id ? { ...i, cantidad: redondearGramos(cantidad), subtotal: calcularSubtotal(i.precio_unitario, cantidad) } : i,
  )
}

import { leerToken, pedirClave } from './sesion'

export type Rol = 'caja' | 'pantalla' | 'escaner'

export interface LineaEnVivo {
  id: string
  nombre: string
  cantidad: string
  detalle: string
  subtotal: number
}

export interface VentaEnVivo {
  items: LineaEnVivo[]
  total: number
  recibido: number | null
  cobrada: { id: string; total: number; vuelto: number } | null
}

export type MensajeServidor =
  | { tipo: 'venta'; venta: VentaEnVivo }
  | { tipo: 'codigo'; codigo: string }
  | { tipo: 'cajas'; conectadas: number }
  | { tipo: 'pong' }

export type MensajeCliente = { tipo: 'venta'; venta: VentaEnVivo } | { tipo: 'codigo'; codigo: string }

export type EstadoVivo = 'conectando' | 'conectada' | 'sin-conexion'

const CIERRE_SIN_SESION = 4401
const PING_MS = 20_000
// Una conexión puede morir sin avisar (el wifi se corta): si no llega ni el pong, se da por muerta.
const SILENCIO_MAXIMO_MS = 45_000
const ESPERA_MAXIMA_MS = 15_000

interface Opciones {
  rol: Rol
  alRecibir: (mensaje: MensajeServidor) => void
  alCambiarEstado: (estado: EstadoVivo) => void
}

// Si se corta, reintenta solo: espera 1 s, 2 s, 4 s… hasta 15 s entre intentos.
export function conectarVivo({ rol, alRecibir, alCambiarEstado }: Opciones) {
  let socket: WebSocket | null = null
  let lista = false
  let intentos = 0
  let ultimoMensaje = 0
  let reintento: ReturnType<typeof setTimeout> | undefined
  let latido: ReturnType<typeof setInterval> | undefined
  // La caja la vuelve a mandar al reconectar: el servidor pudo haberse reiniciado y no tenerla.
  let ventaActual: VentaEnVivo | null = null

  // El evento close puede tardar en llegar: mientras tanto el socket ya no está OPEN y send() falla.
  const abierto = () => socket?.readyState === WebSocket.OPEN
  const mandar = (mensaje: object) => abierto() && socket!.send(JSON.stringify(mensaje))

  const abrir = () => {
    clearTimeout(reintento)
    alCambiarEstado('conectando')
    const protocolo = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const nuevo = new WebSocket(`${protocolo}//${location.host}/api/vivo`)
    socket = nuevo
    lista = false

    nuevo.onopen = () => {
      ultimoMensaje = Date.now()
      mandar({ tipo: 'hola', rol, token: leerToken() })
      latido = setInterval(() => {
        if (Date.now() - ultimoMensaje > SILENCIO_MAXIMO_MS) perder(nuevo)
        else mandar({ tipo: 'ping' })
      }, PING_MS)
    }

    nuevo.onmessage = (evento) => {
      ultimoMensaje = Date.now()
      if (!lista) {
        lista = true
        intentos = 0
        alCambiarEstado('conectada')
        if (ventaActual) mandar({ tipo: 'venta', venta: ventaActual })
      }
      alRecibir(JSON.parse(evento.data) as MensajeServidor)
    }

    nuevo.onclose = (evento) => {
      if (evento.code === CIERRE_SIN_SESION) pedirClave()
      perder(nuevo)
    }
  }

  // Suelta el socket sin esperar su evento close: en una conexión muerta puede tardar minutos.
  const perder = (viejo: WebSocket) => {
    if (viejo !== socket) return
    viejo.onclose = null
    viejo.close()
    socket = null
    clearInterval(latido)
    alCambiarEstado('sin-conexion')
    reintento = setTimeout(abrir, Math.min(1000 * 2 ** intentos, ESPERA_MAXIMA_MS))
    intentos++
  }

  // Al volver a la app, el celu pudo haber dormido la conexión sin que nadie lo note.
  const revisar = () => {
    if (document.visibilityState !== 'visible') return
    if (!socket) abrir()
    else if (lista && Date.now() - ultimoMensaje > PING_MS + 5000) perder(socket)
  }

  abrir()
  window.addEventListener('online', revisar)
  document.addEventListener('visibilitychange', revisar)

  return {
    // Devuelve false si no llegó a salir: sin conexión el mensaje se pierde (salvo el estado de la venta).
    enviar(mensaje: MensajeCliente): boolean {
      if (mensaje.tipo === 'venta') ventaActual = mensaje.venta
      if (!lista || !abierto()) return false
      mandar(mensaje)
      return true
    },

    cerrar() {
      clearTimeout(reintento)
      clearInterval(latido)
      window.removeEventListener('online', revisar)
      document.removeEventListener('visibilitychange', revisar)
      const ultimo = socket
      if (!ultimo) return
      ultimo.onclose = null
      // Cerrarlo mientras conecta ensucia la consola: se espera a que abra y ahí se cierra.
      if (ultimo.readyState === WebSocket.CONNECTING) ultimo.onopen = () => ultimo.close()
      else ultimo.close()
    },
  }
}

export type ConexionVivo = ReturnType<typeof conectarVivo>

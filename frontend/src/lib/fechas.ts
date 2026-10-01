const hora = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const fechaHora = new Intl.DateTimeFormat('es-AR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

export function formatearHora(iso: string): string {
  return hora.format(new Date(iso))
}

export function formatearFechaHora(iso: string): string {
  return fechaHora.format(new Date(iso))
}

// Siempre en hora de Argentina, aunque el dispositivo tenga otra zona configurada.
const ZONA = 'America/Argentina/Buenos_Aires'
// Argentina no tiene horario de verano: UTC−3 todo el año.
const DESFASE_MS = 3 * 3600_000

const hora = new Intl.DateTimeFormat('es-AR', { timeZone: ZONA, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const dia = new Intl.DateTimeFormat('es-AR', { timeZone: ZONA, weekday: 'short', day: 'numeric', month: 'short' })
const mes = new Intl.DateTimeFormat('es-AR', { timeZone: ZONA, month: 'long' })

export function formatearHora(iso: string): string {
  return hora.format(new Date(iso))
}

// "vie 20 nov": Intl lo devuelve como "vie, 20 nov".
export function formatearDia(iso: string): string {
  return dia.format(new Date(iso)).replace(',', '')
}

// Redondeado: 5 h 55 min 40 s cuenta como 5 h 56 min en todos lados.
export function minutosEntre(desde: string, hasta: Date): number {
  return Math.max(0, Math.round((hasta.getTime() - new Date(desde).getTime()) / 60_000))
}

// 390 → "6 h 30 min", 45 → "45 min", 240 → "4 h".
export function formatearDuracion(minutos: number): string {
  const horas = Math.floor(minutos / 60)
  const resto = Math.round(minutos % 60)
  if (horas === 0) return `${resto} min`
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`
}

export interface Periodo {
  clave: 'semana' | 'mes' | 'mes-anterior'
  nombre: string
  desde: Date
  hasta: Date
}

// La semana arranca el lunes. Los límites son la medianoche de Argentina.
export function periodos(ahora = new Date()): Periodo[] {
  // Corrido 3 horas, los getUTC* devuelven la fecha que se ve en Argentina.
  const local = new Date(ahora.getTime() - DESFASE_MS)
  const [anio, mesActual, diaActual] = [local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()]
  const desdeElLunes = (local.getUTCDay() + 6) % 7
  const medianoche = (a: number, m: number, d: number) => new Date(Date.UTC(a, m, d) + DESFASE_MS)
  const nombreDelMes = (fecha: Date) => {
    const nombre = mes.format(fecha)
    return nombre[0].toUpperCase() + nombre.slice(1)
  }

  const inicioDelMes = medianoche(anio, mesActual, 1)
  const inicioDelAnterior = medianoche(anio, mesActual - 1, 1)
  return [
    { clave: 'semana', nombre: 'Esta semana', desde: medianoche(anio, mesActual, diaActual - desdeElLunes), hasta: medianoche(anio, mesActual, diaActual + 1) },
    { clave: 'mes', nombre: nombreDelMes(inicioDelMes), desde: inicioDelMes, hasta: medianoche(anio, mesActual + 1, 1) },
    { clave: 'mes-anterior', nombre: nombreDelMes(inicioDelAnterior), desde: inicioDelAnterior, hasta: inicioDelMes },
  ]
}

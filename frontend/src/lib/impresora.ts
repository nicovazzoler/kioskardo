import type { Linea } from './ticket'

export const PAPELES = [
  { mm: 58, columnas: 32 },
  { mm: 80, columnas: 48 },
]

const CLAVE = 'kioskardo:columnas'

// Se guarda en el dispositivo y no en el servidor: depende de la impresora vinculada a esta tablet.
export function leerColumnas(): number {
  try {
    return localStorage.getItem(CLAVE) === '48' ? 48 : 32
  } catch {
    return 32
  }
}

export function guardarColumnas(columnas: number) {
  try {
    localStorage.setItem(CLAVE, String(columnas))
  } catch {
    // Sin almacenamiento disponible: vale para esta sesión nada más.
  }
}

const ESC = 0x1b
const GS = 0x1d

// La impresora no entiende UTF-8: con "ESC t 2" usa la tabla CP850, que trae los acentos del castellano.
const CP850: Record<string, number> = {
  á: 0xa0, é: 0x82, í: 0xa1, ó: 0xa2, ú: 0xa3,
  Á: 0xb5, É: 0x90, Í: 0xd6, Ó: 0xe0, Ú: 0xe9,
  ñ: 0xa4, Ñ: 0xa5, ü: 0x81, Ü: 0x9a,
  '¿': 0xa8, '¡': 0xad, '°': 0xf8,
}
const SIGNO_PREGUNTA = 0x3f

function aBytes(texto: string): number[] {
  return [...texto].map((c) => CP850[c] ?? (c.charCodeAt(0) < 0x80 ? c.charCodeAt(0) : SIGNO_PREGUNTA))
}

export function aEscPos(lineas: Linea[]): Uint8Array {
  const bytes = [ESC, 0x40, ESC, 0x74, 2]
  for (const linea of lineas) {
    bytes.push(ESC, 0x61, linea.centrado ? 1 : 0)
    bytes.push(ESC, 0x45, linea.negrita ? 1 : 0)
    // Doble alto y no doble ancho: así el renglón conserva las mismas columnas.
    bytes.push(GS, 0x21, linea.grande ? 0x01 : 0x00)
    bytes.push(...aBytes(linea.texto), 0x0a)
  }
  // Avanza el papel y corta. Si la impresora no tiene cortador, ignora el comando.
  bytes.push(ESC, 0x64, 4, GS, 0x56, 0x42, 0)
  return Uint8Array.from(bytes)
}

export function urlRawbt(bytes: Uint8Array): string {
  let binario = ''
  for (const byte of bytes) binario += String.fromCharCode(byte)
  return 'rawbt:base64,' + btoa(binario)
}

// RawBT (app de Android) recibe los bytes por su esquema de URL y los manda por Bluetooth a la impresora.
export function imprimir(lineas: Linea[]) {
  window.location.href = urlRawbt(aEscPos(lineas))
}

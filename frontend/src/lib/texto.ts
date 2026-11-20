// "Alfajór  JORGITO" -> "alfajor jorgito", para buscar sin importar tildes ni mayúsculas.
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

// Heurística: si lo que se tipeó son solo dígitos y es largo, probablemente es un código de barras.
export function pareceCodigoDeBarras(texto: string): boolean {
  return /^\d{6,}$/.test(texto.trim())
}

// ["Juan", "Ana", "Luis"] -> "Juan, Ana y Luis".
export function unirConY(partes: string[]): string {
  if (partes.length <= 1) return partes.join('')
  return `${partes.slice(0, -1).join(', ')} y ${partes.at(-1)}`
}

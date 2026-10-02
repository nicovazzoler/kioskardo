// "Alfajór  JORGITO" -> "alfajor jorgito", para buscar sin importar tildes ni mayúsculas.
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

// Heurística: si lo que se tipeó son solo dígitos y es largo, probablemente es un código de barras.
export function pareceCodigoDeBarras(texto: string): boolean {
  return /^\d{6,}$/.test(texto.trim())
}

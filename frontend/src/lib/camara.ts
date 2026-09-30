// El detector nativo existe en Chrome de Android; en PC se usa la pistola.
export const camaraDisponible = typeof window !== 'undefined' && 'BarcodeDetector' in window

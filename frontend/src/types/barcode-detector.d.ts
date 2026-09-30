// BarcodeDetector es una API de Chrome (Android, macOS, ChromeOS) que TypeScript todavía no trae tipada.
interface DetectedBarcode {
  rawValue: string
  format: string
}

declare class BarcodeDetector {
  constructor(opciones?: { formats?: string[] })
  static getSupportedFormats(): Promise<string[]>
  detect(imagen: ImageBitmapSource): Promise<DetectedBarcode[]>
}

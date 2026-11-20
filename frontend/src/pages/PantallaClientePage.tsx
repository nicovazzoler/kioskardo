import { formatearPesos } from '../lib/dinero'

// Vista para la pantalla que mira el cliente: sin navegación, letras grandes.
export function PantallaClientePage() {
  return (
    <div className="flex h-full flex-col bg-fondo text-tinta">
      <header className="flex items-center gap-3 px-8 py-6">
        <img src="/logo.svg" alt="" className="h-10 w-10" />
        <span className="font-display text-3xl font-semibold">Kioskardo</span>
      </header>
      <div className="flex flex-1 items-center justify-center text-3xl text-apagado">
        ¡Hola! Esperando la próxima venta…
      </div>
      <footer className="flex items-baseline justify-between bg-panel px-8 py-8">
        <span className="text-3xl text-tenue">Total</span>
        <span className="font-display text-6xl font-semibold tabular-nums md:text-8xl">{formatearPesos(0)}</span>
      </footer>
    </div>
  )
}

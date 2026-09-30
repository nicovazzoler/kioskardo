import { formatearPesos } from '../lib/dinero'

// Vista para la pantalla que mira el cliente: sin navegación, letras grandes.
// En la fase 5 se conecta por WebSocket a la venta en curso.
export function PantallaClientePage() {
  return (
    <div className="flex h-full flex-col bg-slate-900 text-white">
      <header className="flex items-center gap-3 px-8 py-6">
        <img src="/logo.svg" alt="" className="h-10 w-10" />
        <span className="text-2xl font-semibold">Kioskardo</span>
      </header>
      <div className="flex flex-1 items-center justify-center text-3xl text-slate-400">
        ¡Hola! Esperando la próxima venta…
      </div>
      <footer className="flex items-baseline justify-between bg-slate-800 px-8 py-8">
        <span className="text-3xl text-slate-300">Total</span>
        <span className="text-6xl font-bold tabular-nums md:text-8xl">{formatearPesos(0)}</span>
      </footer>
    </div>
  )
}

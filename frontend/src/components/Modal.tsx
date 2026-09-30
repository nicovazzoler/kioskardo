import { useEffect, type ReactNode } from 'react'

interface Props {
  titulo: string
  alCerrar: () => void
  children: ReactNode
}

// Celular: hoja que sube desde abajo y ocupa casi toda la pantalla.
// Tablet/PC: ventana centrada.
export function Modal({ titulo, alCerrar, children }: Props) {
  useEffect(() => {
    const alPresionar = (evento: KeyboardEvent) => evento.key === 'Escape' && alCerrar()
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [alCerrar])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 md:items-center md:p-6" onClick={alCerrar}>
      <div
        role="dialog"
        aria-label={titulo}
        className="flex max-h-[95%] w-full flex-col rounded-t-2xl bg-white shadow-xl md:max-w-lg md:rounded-2xl"
        // Evita que un click adentro llegue al fondo y cierre el modal.
        onClick={(evento) => evento.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold">{titulo}</h2>
          <button type="button" onClick={alCerrar} className="-mr-2 rounded-lg p-2 text-2xl leading-none text-slate-500 hover:bg-slate-100" aria-label="Cerrar">
            ×
          </button>
        </header>
        <div className="overflow-y-auto px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>
  )
}

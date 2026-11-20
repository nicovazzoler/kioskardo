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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 md:items-center md:p-6" onClick={alCerrar}>
      <div
        role="dialog"
        aria-label={titulo}
        className="flex max-h-[95%] w-full flex-col rounded-t-lg border-t border-borde bg-panel shadow-2xl md:max-w-lg md:rounded-lg md:border"
        // Evita que un click adentro llegue al fondo y cierre el modal.
        onClick={(evento) => evento.stopPropagation()}
      >
        <header className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 className="font-display text-2xl font-semibold tracking-tight">{titulo}</h2>
          <button
            type="button"
            onClick={alCerrar}
            className="-mr-2 flex h-11 w-11 items-center justify-center rounded-md text-2xl leading-none text-tenue hover:bg-elevado hover:text-tinta"
            aria-label="Cerrar"
          >
            ×
          </button>
        </header>
        <div className="overflow-y-auto px-6 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>
  )
}

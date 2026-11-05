import type { InputHTMLAttributes, ReactNode, Ref } from 'react'
import { claseInput } from '../lib/estilos'

interface CampoProps {
  etiqueta: string
  error?: string | null
  ayuda?: string
  // Con varios botones adentro no se usa <label>: un click en la etiqueta "apretaría" el primer botón.
  grupo?: boolean
  children: ReactNode
}

export function Campo({ etiqueta, error, ayuda, grupo, children }: CampoProps) {
  const Contenedor = grupo ? 'div' : 'label'
  return (
    <Contenedor className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{etiqueta}</span>
      {children}
      {error ? <span className="mt-1 block text-sm text-red-600">{error}</span> : ayuda && <span className="mt-1 block text-sm text-slate-500">{ayuda}</span>}
    </Contenedor>
  )
}

interface InputPesosProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  ref?: Ref<HTMLInputElement>
  valor: string
  alCambiar: (valor: string) => void
  error?: boolean
}

// El resto de las props (autoFocus, placeholder, etc.) pasan directo al <input>.
export function InputPesos({ ref, valor, alCambiar, error = false, className = '', ...resto }: InputPesosProps) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400">$</span>
      <input
        ref={ref}
        value={valor}
        onChange={(e) => alCambiar(e.target.value)}
        inputMode="decimal"
        className={`${claseInput(error)} pl-7 ${className}`}
        {...resto}
      />
    </div>
  )
}

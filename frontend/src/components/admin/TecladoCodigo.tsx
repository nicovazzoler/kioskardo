import { useEffect, useEffectEvent, useState } from 'react'
import { LARGO_CODIGO } from '../../lib/codigoAdmin'

const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

interface Props {
  // Devuelve si el código era el correcto; si no, se borra y se muestra el error.
  alCompletar: (codigo: string) => Promise<boolean>
}

// Teclado en pantalla para la tablet; con teclado físico también se pueden tipear los números.
export function TecladoCodigo({ alCompletar }: Props) {
  const [digitos, setDigitos] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [verificando, setVerificando] = useState(false)

  const verificar = async (codigo: string) => {
    setVerificando(true)
    try {
      if (!(await alCompletar(codigo))) {
        setError('Código incorrecto')
        setDigitos('')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo verificar el código')
      setDigitos('')
    } finally {
      setVerificando(false)
    }
  }

  const agregar = (digito: string) => {
    if (verificando || digitos.length >= LARGO_CODIGO) return
    const nuevo = digitos + digito
    setDigitos(nuevo)
    setError(null)
    if (nuevo.length === LARGO_CODIGO) void verificar(nuevo)
  }

  const borrar = () => setDigitos((actual) => actual.slice(0, -1))

  const alPresionar = useEffectEvent((evento: KeyboardEvent) => {
    if (/^\d$/.test(evento.key)) agregar(evento.key)
    else if (evento.key === 'Backspace') borrar()
  })

  useEffect(() => {
    const oyente = (evento: KeyboardEvent) => alPresionar(evento)
    window.addEventListener('keydown', oyente)
    return () => window.removeEventListener('keydown', oyente)
  }, [])

  return (
    <div className="flex flex-col items-center gap-4">
      <div role="status" aria-label={`Código: ${digitos.length} de ${LARGO_CODIGO} dígitos`} className="flex gap-4">
        {Array.from({ length: LARGO_CODIGO }, (_, indice) => (
          <span key={indice} className={`flex h-12 w-10 items-center justify-center border-b-2 font-display text-3xl ${indice < digitos.length ? 'border-ambar' : 'border-borde'}`}>
            {indice < digitos.length ? '•' : ''}
          </span>
        ))}
      </div>
      <p className="h-5 text-sm text-error">{error}</p>
      <div className="grid w-72 grid-cols-3 gap-1.5">
        {TECLAS.map((tecla) => (
          <BotonTecla key={tecla} alTocar={() => agregar(tecla)}>
            {tecla}
          </BotonTecla>
        ))}
        <span />
        <BotonTecla alTocar={() => agregar('0')}>0</BotonTecla>
        <button type="button" onClick={borrar} className="h-16 rounded-sm text-sm text-tenue hover:bg-elevado hover:text-tinta">
          Borrar
        </button>
      </div>
    </div>
  )
}

function BotonTecla({ alTocar, children }: { alTocar: () => void; children: string }) {
  return (
    <button type="button" onClick={alTocar} className="h-16 rounded-sm font-display text-3xl font-medium hover:bg-elevado">
      {children}
    </button>
  )
}

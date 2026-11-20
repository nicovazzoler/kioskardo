import { useEffect, useState } from 'react'

// Se actualiza cada minuto: alcanza para mostrar cuánto lleva un turno.
export function useAhora(intervaloMs = 60_000) {
  const [ahora, setAhora] = useState(() => new Date())
  useEffect(() => {
    const intervalo = setInterval(() => setAhora(new Date()), intervaloMs)
    return () => clearInterval(intervalo)
  }, [intervaloMs])
  return ahora
}

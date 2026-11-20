import { Outlet } from 'react-router'
import { IngresoClave } from '../components/IngresoClave'
import { useNecesitaClave } from '../lib/sesion'

// Para las pantallas que van en otro dispositivo: sin menú, pero con el ingreso de la clave.
export function SinMenuLayout() {
  const necesitaClave = useNecesitaClave()

  return (
    <>
      <Outlet />
      {necesitaClave && <IngresoClave />}
    </>
  )
}

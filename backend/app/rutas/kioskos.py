from fastapi import APIRouter

from app.esquemas import CodigoAdminGuardar, KioskoGuardar, KioskoLeer
from app.kiosko import KioskoIdDep, SesionDep
from app.modelos import Kiosko

router = APIRouter(prefix="/api/kiosko", tags=["kiosko"])


@router.get("")
def leer_kiosko(sesion: SesionDep, kiosko_id: KioskoIdDep) -> KioskoLeer:
    return sesion.get(Kiosko, kiosko_id)


@router.put("")
def guardar_kiosko(datos: KioskoGuardar, sesion: SesionDep, kiosko_id: KioskoIdDep) -> KioskoLeer:
    kiosko = sesion.get(Kiosko, kiosko_id)
    for campo, valor in datos.model_dump().items():
        setattr(kiosko, campo, valor)
    sesion.commit()
    return kiosko


@router.put("/codigo-admin")
def guardar_codigo_admin(
    datos: CodigoAdminGuardar, sesion: SesionDep, kiosko_id: KioskoIdDep
) -> KioskoLeer:
    """Recibe el hash, no el código: el servidor nunca lo ve. Es un freno para empleados, no
    seguridad: el hash viaja a cada dispositivo para poder pedir el código sin conexión.
    """
    kiosko = sesion.get(Kiosko, kiosko_id)
    kiosko.codigo_admin_hash = datos.hash
    sesion.commit()
    return kiosko

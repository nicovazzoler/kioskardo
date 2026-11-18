from fastapi import APIRouter

from app.esquemas import KioskoGuardar, KioskoLeer
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

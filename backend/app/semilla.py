"""Crea el kiosko inicial si no existe. Uso: python -m app.semilla"""

from sqlalchemy import select

from app.db import SesionLocal
from app.modelos import Kiosko

NOMBRE_KIOSKO = "Kiosko de la esquina"


def main() -> None:
    with SesionLocal() as sesion:
        kiosko = sesion.scalar(select(Kiosko).limit(1))
        if kiosko is None:
            kiosko = Kiosko(nombre=NOMBRE_KIOSKO)
            sesion.add(kiosko)
            sesion.commit()
            print(f"Kiosko creado: {kiosko.id}")
        else:
            print(f"Ya existe el kiosko: {kiosko.id} ({kiosko.nombre})")


if __name__ == "__main__":
    main()

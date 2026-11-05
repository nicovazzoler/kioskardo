"""motivo de stock anulacion

Revision ID: 3f0c08c167e0
Revises: af146e38f60e
Create Date: 2026-10-01 16:34:21.964009

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3f0c08c167e0'
down_revision: Union[str, Sequence[str], None] = 'af146e38f60e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Los enums son VARCHAR + CHECK: sumar un valor es reemplazar el CHECK. Alembic no lo detecta solo.
# op.f(): el nombre ya es el final, sin aplicarle la convención de nombres de db.py.
NOMBRE = "ck_movimientos_stock_motivostock"
ANTES = "motivo IN ('compra', 'venta', 'ajuste', 'merma')"
DESPUES = "motivo IN ('compra', 'venta', 'ajuste', 'merma', 'anulacion')"


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_constraint(op.f(NOMBRE), "movimientos_stock", type_="check")
    op.create_check_constraint(op.f(NOMBRE), "movimientos_stock", DESPUES)


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DELETE FROM movimientos_stock WHERE motivo = 'anulacion'")
    op.drop_constraint(op.f(NOMBRE), "movimientos_stock", type_="check")
    op.create_check_constraint(op.f(NOMBRE), "movimientos_stock", ANTES)

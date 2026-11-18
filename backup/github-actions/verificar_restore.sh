#!/usr/bin/env bash
#
# Restaura el dump en una base vacía y descartable y la compara contra la original.
# Que pg_restore pueda leer el archivo no alcanza: tienen que volver las mismas ventas y la misma plata.
#
#   DATABASE_URL="postgresql://..." bash verificar_restore.sh archivo.dump "postgresql://descartable"

set -euo pipefail

ARCHIVO="${1:?falta el archivo .dump}"
DESCARTABLE="${2:?falta la URL de la base descartable}"

if [ -z "${DATABASE_URL:-}" ]; then
    echo "ERROR: falta DATABASE_URL (la base original, para comparar)" >&2
    exit 1
fi

echo "Restaurando $(basename "$ARCHIVO") en una base descartable..."
pg_restore --dbname="$DESCARTABLE" --no-owner --no-privileges "$ARCHIVO" > /dev/null

CONSULTAS=(
    "SELECT count(*) FROM kioskos"
    "SELECT count(*) FROM productos"
    "SELECT count(*) FROM movimientos_stock"
    "SELECT count(*) FROM cajas"
    "SELECT count(*) FROM ventas"
    "SELECT count(*) FROM venta_items"
    "SELECT count(*) FROM venta_pagos"
    "SELECT count(*) FROM movimientos_caja"
    "SELECT coalesce(sum(total), 0) FROM ventas"
    "SELECT coalesce(sum(monto), 0) FROM venta_pagos"
    "SELECT coalesce(sum(monto), 0) FROM movimientos_caja"
    "SELECT coalesce(sum(cantidad), 0) FROM movimientos_stock"
)

FALLOS=0
for consulta in "${CONSULTAS[@]}"; do
    ORIGEN=$(psql "$DATABASE_URL" -tAc "$consulta")
    COPIA=$(psql "$DESCARTABLE" -tAc "$consulta")
    ETIQUETA="${consulta#SELECT }"
    if [ "$ORIGEN" = "$COPIA" ]; then
        printf '  OK   %-46s %s\n' "$ETIQUETA" "$ORIGEN"
    else
        printf '  MAL  %-46s origen=%s copia=%s\n' "$ETIQUETA" "$ORIGEN" "$COPIA"
        FALLOS=$((FALLOS + 1))
    fi
done

if [ "$FALLOS" -ne 0 ]; then
    # Puede pasar si una venta sin conexión se subió justo mientras corría: volver a correrlo.
    echo "ERROR: la copia restaurada no coincide con la base. NO sirve como backup." >&2
    exit 1
fi

echo "El backup se restaura y da los mismos números."

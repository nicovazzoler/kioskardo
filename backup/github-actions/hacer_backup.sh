#!/usr/bin/env bash
#
# Hace el pg_dump y solo lo deja en el destino si pasa las verificaciones.
# Sale con 1 ante cualquier problema: un backup que falla callado es peor que no tener backup.
#
#   DATABASE_URL="postgresql://..." bash hacer_backup.sh [carpeta_destino]

set -euo pipefail

DESTINO="${1:-.}"
# Las 8 tablas de la app más alembic_version. Menos que eso es un dump cortado.
MINIMO_TABLAS="${MINIMO_TABLAS:-9}"
MINIMO_BYTES="${MINIMO_BYTES:-2000}"

if [ -z "${DATABASE_URL:-}" ]; then
    echo "ERROR: falta DATABASE_URL" >&2
    exit 1
fi

mkdir -p "$DESTINO"

# Hora argentina en el nombre: corre a las 03:00 UTC y en UTC diría el día siguiente.
SELLO="$(TZ=America/Argentina/Buenos_Aires date +%Y%m%d_%H%M)"
ARCHIVO="$DESTINO/kioskardo_${SELLO}.dump"

# pg_dump crea el archivo antes de conectarse: si falla, deja uno vacío. Por eso se escribe
# en un temporal y se mueve recién cuando pasó todo.
TEMPORAL="$(mktemp -t kioskardo.XXXXXX.dump)"
trap 'rm -f "$TEMPORAL"' EXIT

echo "Servidor: $(psql "$DATABASE_URL" -tAc 'SELECT version()' | cut -c1-40)"

# --no-owner y --no-privileges: así se restaura en cualquier servidor sin los roles de Railway.
pg_dump "$DATABASE_URL" --format=custom --no-owner --no-privileges --file="$TEMPORAL"

BYTES=$(stat -c%s "$TEMPORAL")
if [ "$BYTES" -lt "$MINIMO_BYTES" ]; then
    echo "ERROR: el dump salió de $BYTES bytes, está vacío o cortado" >&2
    exit 1
fi

# Un dump corrupto pesa lo mismo que uno sano: hay que poder leerlo.
if ! LISTADO=$(pg_restore --list "$TEMPORAL" 2>&1); then
    echo "ERROR: pg_restore no puede leer el dump, está corrupto" >&2
    echo "$LISTADO" >&2
    exit 1
fi

TABLAS=$(echo "$LISTADO" | grep -c "TABLE DATA" || true)
if [ "$TABLAS" -lt "$MINIMO_TABLAS" ]; then
    echo "ERROR: el dump trae $TABLAS tablas y esperábamos al menos $MINIMO_TABLAS" >&2
    exit 1
fi

mv "$TEMPORAL" "$ARCHIVO"
echo "OK: $(basename "$ARCHIVO") — $((BYTES / 1024)) KB, $TABLAS tablas"

if [ -n "${GITHUB_OUTPUT:-}" ]; then
    {
        echo "archivo=$ARCHIVO"
        echo "nombre=$(basename "$ARCHIVO" .dump)"
        echo "kb=$((BYTES / 1024))"
        echo "tablas=$TABLAS"
    } >> "$GITHUB_OUTPUT"
fi

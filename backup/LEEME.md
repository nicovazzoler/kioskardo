# Backups

La base tiene las ventas, las cajas y el stock del kiosco. En el plan Hobby, Railway no hace
backups (los de punto exacto en el tiempo son del plan Pro), así que la copia la tenemos que
hacer nosotros.

| Qué | Cada cuánto | Dónde queda |
|---|---|---|
| `pg_dump` en GitHub Actions | todas las noches, 00:00 hora argentina | artifact de un repo privado, 90 días |

Antes de dar un backup por bueno, el workflow lo **restaura en una base descartable y la compara
contra la original**: cantidad de filas de cada tabla, el total de las ventas, de los pagos, de los
movimientos de caja y del stock. Si algo no coincide, la corrida falla y GitHub manda un mail.

## Instalarlo (una sola vez, después del deploy)

1. **Crear un repositorio PRIVADO** en GitHub, por ejemplo `kioskardo_backups`.
   Tiene que ser privado: los artifacts de un repo público los puede bajar cualquiera.

2. **Copiar estos archivos** de `backup/github-actions/` a ese repo:

   ```
   .github/workflows/backup.yml   <- backup.yml
   scripts/hacer_backup.sh        <- hacer_backup.sh
   scripts/verificar_restore.sh   <- verificar_restore.sh
   .gitattributes                 <- .gitattributes
   ```

   El `.gitattributes` hace falta si se suben desde Windows: sin él, los `.sh` pueden quedar con
   finales de línea de Windows y fallan en GitHub con `$'\r': command not found`.

3. **Cargar la URL de la base** en ese repo: *Settings → Secrets and variables → Actions →
   New repository secret*.
   - Nombre: `DATABASE_URL`
   - Valor: en Railway, servicio Postgres → *Variables* → **`DATABASE_PUBLIC_URL`**.
     La que termina en `.railway.internal` no sirve: solo funciona adentro de Railway.

4. **Probarlo**: pestaña *Actions* → *Backup de la base* → *Run workflow*. Si sale verde, en la
   portada del repo aparece `ULTIMO_BACKUP.md` con la fecha.

## Cómo saber que sigue andando

- **`ULTIMO_BACKUP.md`** en la portada del repo tiene la fecha del último backup bueno. Si quedó
  vieja, el backup dejó de correr.
- **Si una corrida falla, GitHub manda un mail.** No dejarlo pasar: esa noche no hubo copia, o
  salió una que no restaura bien. Si falló porque una venta sin conexión se subió justo mientras
  corría, alcanza con volver a correrlo a mano.
- GitHub apaga los workflows programados de repos sin actividad durante 60 días. El commit diario
  de `ULTIMO_BACKUP.md` evita eso, pero si llega un mail avisando que lo va a desactivar, entrar y
  reactivarlo.

## Bajar un backup

Pestaña **Actions** → la corrida del día que se busca → abajo de todo, en **Artifacts**.

## Restaurar

Nunca encima de la base en uso como primer paso. Primero una base nueva al lado:

```bash
# 1. En Railway: Create -> Database -> PostgreSQL (queda una base vacía nueva)
# 2. Restaurar el dump ahí, con su DATABASE_PUBLIC_URL
pg_restore --dbname="URL_DE_LA_BASE_NUEVA" --no-owner --no-privileges kioskardo_20261118_0000.dump
```

Después apuntar la app a esa base (variable `DATABASE_URL` del servicio) y revisar en Caja que
la última caja cerrada dé lo mismo que antes.

## Qué se probó

Contra PostgreSQL 16, con los mismos scripts:

- `hacer_backup.sh` con una base con ventas y con una recién creada (solo el kiosko): las dos
  dan un dump de 9 tablas que se restaura.
- Los cuatro casos de falla salen con error y **no dejan archivo**: sin `DATABASE_URL`, base
  inexistente, dump corrupto (cortado a propósito) y menos tablas de las esperadas.
- `verificar_restore.sh` restaurando en un `postgres:16` de Docker, como hace el workflow: con
  una copia sana da todo igual, y si la base cambia después del dump lo detecta y falla.

Lo que no se pudo probar acá: el workflow corriendo en GitHub (instalar el `pg_dump` del servidor,
subir el artifact y el commit de `ULTIMO_BACKUP.md`). Se prueba con el paso 4 de la instalación.

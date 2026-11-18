# Deploy en Railway

La app corre en un solo servicio de Railway: el backend sirve la API y también el frontend
compilado, así que queda una sola URL con HTTPS. La base es un Postgres de Railway.

Cómo se arma la imagen está en el `Dockerfile` de la raíz. En cada arranque corre las migraciones
pendientes, crea el kiosko inicial si no existe y levanta el servidor. `railway.json` le dice a
Railway que use ese Dockerfile y que controle `/api/salud` antes de dar el deploy por bueno.

## Primera vez

1. En railway.com: **New Project → Deploy from GitHub repo** y elegir `kioskardo`.
   El primer deploy va a fallar porque todavía no hay base ni clave. Es normal.
2. En el mismo proyecto: **Create → Database → PostgreSQL**.
3. En el servicio de la app, pestaña **Variables**, agregar:

   | Variable | Valor |
   |---|---|
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (referencia a la base del paso 2) |
   | `CLAVE_ACCESO` | La clave del kiosco. Una nueva, no la de otro sistema. |

   Al guardar, Railway vuelve a deployar solo.
4. Pestaña **Settings → Networking → Generate Domain**. Esa es la URL de la app.
5. Abrir la URL, ingresar la clave y cargar los datos del negocio en **Ajustes**.

Después de esto, cada push o merge a `main` se deploya solo.

## En la tablet del kiosco

1. Abrir la URL en Chrome e ingresar la clave.
2. Menú **⋮ → Instalar app**. Queda un ícono y se abre a pantalla completa.
3. Vincular la impresora y RawBT siguiendo los pasos de **Ajustes → Impresora**.

## La clave

- Sin `CLAVE_ACCESO`, con una base que no sea local, el servidor no arranca.
- Cambiarla cierra la sesión en todos los dispositivos: es lo que hay que hacer si se pierde o
  roban una tablet.
- Una clave incorrecta tarda 1 segundo en responder, para que no se puedan probar miles.

## Probar la imagen en la compu

Con Docker y un Postgres local:

```bash
docker build -t kioskardo .
docker run --rm --network host \
  -e DATABASE_URL=postgresql://kioskardo:kioskardo@localhost:5432/kioskardo \
  -e CLAVE_ACCESO=una-clave -e PORT=8080 kioskardo
```

App en http://localhost:8080.

## Pendiente

- **Backups de la base.** Todavía no hay. Antes de que el kiosco dependa de la app hay que
  armarlos, como los de la pelu.

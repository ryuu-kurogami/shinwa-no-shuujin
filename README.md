# Crónicas

Plataforma para publicar tus historias cortas, con login de Google, edición/borrado
solo del propio autor, comentarios públicos y privados, y captcha anti-bots.

## 1. Instalar y probar en local

```bash
npm install
cp .env.example .env
```

Completá `.env` con los valores que sacás en los pasos 2, 3 y 4. Después:

```bash
npm run dev
```

## 2. Crear el proyecto en Supabase (gratis)

1. Andá a [supabase.com](https://supabase.com) → "Start your project" → creá una cuenta.
2. "New project" → ponele nombre (ej. `cronicas`) → elegí una contraseña de base de
   datos (guardala, no la vas a necesitar en el código pero por las dudas) → creá.
3. Cuando el proyecto esté listo: **Project Settings → API**. Ahí copiás:
   - `Project URL` → va en `VITE_SUPABASE_URL`
   - `anon public` key → va en `VITE_SUPABASE_ANON_KEY`
   - (Nunca copies la `service_role` key a este proyecto — esa es solo para
     backend/servidor, jamás para el navegador.)
4. **SQL Editor → New query**. Pegá todo el contenido de `supabase-schema.sql`
   (está en la raíz de este proyecto) y dale "Run". Eso crea las tablas y las
   reglas de seguridad (quién puede leer/escribir qué).
5. **Importante**: en `supabase-schema.sql`, dentro de la función `is_admin()`,
   reemplazá `'tuemail@gmail.com'` por tu email real de Google (el mismo que vas
   a usar para loguearte). Ese es el que tiene permiso de borrar cualquier cosa
   como moderador.

## 3. Activar login con Google

1. En Supabase: **Authentication → Providers → Google** → activalo.
2. Necesitás un Client ID y Client Secret de Google. Se sacan en
   [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
   - Creá un proyecto (o usá uno existente).
   - "Create credentials" → "OAuth client ID" → tipo "Web application".
   - En "Authorized redirect URIs" pegá la URL que Supabase te muestra en esa
     misma pantalla de Providers → Google (termina en `/auth/v1/callback`).
3. Copiá el Client ID y Secret de Google de vuelta a la pantalla de Supabase y
   guardá.
4. En tu `.env`, `VITE_ADMIN_EMAILS` debe tener ese mismo email tuyo.

## 4. Activar el captcha (Cloudflare Turnstile, gratis)

1. Andá a [dash.cloudflare.com](https://dash.cloudflare.com) → Turnstile → "Add site".
2. Poné el dominio donde vas a publicar (podés usar `localhost` mientras probás).
3. Copiá la "Site Key" a `VITE_TURNSTILE_SITE_KEY` en tu `.env`.
4. Si dejás esa variable vacía, el formulario de comentarios funciona igual pero
   sin captcha (útil mientras development).

**Nota de seguridad:** el captcha de este proyecto se valida en el navegador
como primer filtro. Para bloquear bots de verdad conviene, más adelante, verificar
el token también del lado del servidor con una Supabase Edge Function — si te
empieza a llegar spam, avisame y armamos esa pieza.

## 5. Publicar el sitio gratis (Vercel)

1. Subí esta carpeta a un repositorio de GitHub.
2. Andá a [vercel.com](https://vercel.com) → "Add New Project" → importá ese repo.
3. En "Environment Variables" cargá las mismas 4 variables de tu `.env`.
4. Deploy. Te da una URL tipo `cronicas.vercel.app` ya funcionando para
   cualquiera que la abra.

## Cómo quedaron los permisos

- **Cualquiera** (sin cuenta): puede leer historias y dejar comentarios
  (públicos o privados al autor), pasando el captcha.
- **Usuario logueado con Google**: además puede publicar historias, y
  editar/borrar únicamente las suyas — esto lo garantiza la base de datos
  (Row Level Security en `supabase-schema.sql`), no solo el botón en pantalla.
- **Admin** (tu email en `is_admin()` + `VITE_ADMIN_EMAILS`): puede borrar
  cualquier historia o comentario, aunque no sea suyo — pensado para moderar
  contenido que infrinja o dañe.

## Estructura

```
src/
  lib/supabaseClient.js   → conexión a Supabase + lista de admins
  components/
    AuthButton.jsx         → login/logout con Google
    StoryCard.jsx           → tarjeta de la portada + el "sello" de tiempo
    StoryReader.jsx         → lectura completa + editar/borrar
    PublishModal.jsx        → formulario de publicar/editar
    CommentThread.jsx       → comentarios públicos/privados + captcha
  App.jsx                  → arma todo junto
supabase-schema.sql         → tablas + seguridad (correr una sola vez en Supabase)
```

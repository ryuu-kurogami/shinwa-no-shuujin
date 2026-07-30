-- ============================================================
-- CRÓNICAS — esquema de base de datos + seguridad (RLS)
-- Pegá todo esto en Supabase: Dashboard > SQL Editor > New query > Run
-- ============================================================

-- Tabla de historias
create table if not exists stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references auth.users(id) not null,
  author_name text not null,
  title text not null,
  span text not null default 'instante suspendido',
  excerpt text not null,
  content text not null,
  created_at timestamptz not null default now()
);

-- Tabla de comentarios (públicos o privados al autor)
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  story_id uuid references stories(id) on delete cascade not null,
  commenter_name text not null default 'Lector anónimo',
  text text not null,
  is_private boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Row Level Security: sin esto, cualquiera con las claves públicas
-- podría leer/escribir lo que quiera directo en la base de datos.
-- ============================================================

alter table stories enable row level security;
alter table comments enable row level security;

-- STORIES: cualquiera puede leer
create policy "Cualquiera puede leer historias"
  on stories for select
  using (true);

-- STORIES: solo un usuario logueado puede crear, y solo a su propio nombre
create policy "Usuarios logueados publican a su propio nombre"
  on stories for insert
  with check (auth.uid() = author_id);

-- STORIES: solo el autor puede editar su propia historia
create policy "El autor edita solo lo suyo"
  on stories for update
  using (auth.uid() = author_id);

-- STORIES: el autor borra lo suyo; el admin se maneja aparte (ver nota abajo)
create policy "El autor borra solo lo suyo"
  on stories for delete
  using (auth.uid() = author_id);

-- COMMENTS: los comentarios públicos los ve cualquiera;
-- los privados solo los ve el autor de la historia (se resuelve con un join)
create policy "Comentarios públicos visibles para todos"
  on comments for select
  using (
    is_private = false
    or exists (
      select 1 from stories
      where stories.id = comments.story_id
      and stories.author_id = auth.uid()
    )
  );

-- COMMENTS: cualquiera puede comentar (con o sin login) — el captcha se valida
-- en el frontend/edge function antes de llegar acá
create policy "Cualquiera puede comentar"
  on comments for insert
  with check (true);

-- ============================================================
-- Admin: como Supabase no tiene "roles" simples por defecto,
-- la forma más directa es una función que chequea el email contra
-- una lista fija. Reemplazá el email de ejemplo por el tuyo.
-- ============================================================

create or replace function is_admin()
returns boolean as $$
  select auth.jwt() ->> 'email' in ('sg506292@gmail.com')
$$ language sql stable;

create policy "El admin borra cualquier historia"
  on stories for delete
  using (is_admin());

create policy "El admin borra cualquier comentario"
  on comments for delete
  using (is_admin());

-- Índices para que las consultas no se vuelvan lentas con el tiempo
create index if not exists idx_comments_story_id on comments(story_id);
create index if not exists idx_stories_created_at on stories(created_at desc);

-- Schema v2 — Shinwa no Shuujin
-- Última actualización: 1 de agosto de 2026
-- Refleja el estado real de RLS/tablas en producción a esta fecha.
-- Si corrés cambios nuevos en el SQL Editor de Supabase, actualizá este archivo también.

-- ============================================================
-- 1. ASEGURAR COLUMNAS FALTANTES EN TABLAS EXISTENTES
-- ============================================================

-- Tipos Enum
DO $$ BEGIN
    CREATE TYPE categoria_enum AS ENUM ('corto', 'novela', 'fanfic');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE estado_historia_enum AS ENUM ('borrador', 'pendiente_revision', 'publicado');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE motivo_reporte_enum AS ENUM ('plagio_interno', 'plagio_externo', 'contenido_prohibido', 'spam', 'otro');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Columnas en STORIES
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS portada_url TEXT;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS frase_iconica VARCHAR(80) DEFAULT 'Instante suspendido';
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS categoria categoria_enum NOT NULL DEFAULT 'corto';
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS es_adulto BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS declaracion_18_ok BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS estado estado_historia_enum NOT NULL DEFAULT 'publicado';
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS lecturas INTEGER NOT NULL DEFAULT 0;

-- Columnas en COMMENTS
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT false;

-- ============================================================
-- 2. CREACIÓN DE NUEVAS TABLAS (SI NO EXISTEN)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  link_donacion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.guardados (
  usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  historia_id UUID REFERENCES public.stories(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, historia_id)
);

CREATE TABLE IF NOT EXISTS public.likes (
  usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  historia_id UUID REFERENCES public.stories(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, historia_id)
);

CREATE TABLE IF NOT EXISTS public.seguidores (
  seguidor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  seguido_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (seguidor_id, seguido_id),
  CONSTRAINT no_auto_seguir CHECK (seguidor_id <> seguido_id)
);

CREATE TABLE IF NOT EXISTS public.reportes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  historia_id UUID REFERENCES public.stories(id) ON DELETE CASCADE,
  comentario_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  reportado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  motivo motivo_reporte_enum NOT NULL,
  evidencia TEXT,
  estado TEXT NOT NULL DEFAULT 'pendiente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fondos_sitio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL,
  monto NUMERIC(10,2) NOT NULL,
  descripcion TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. HABILITAR RLS Y DEFINIR FUNCIÓN ADMIN
-- ============================================================

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seguidores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reportes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fondos_sitio ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(auth.jwt() ->> 'email', '') IN ('shinwanoshuujin@gmail.com')
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- 4. APLICACIÓN DE POLÍTICAS DE SEGURIDAD (RLS)
-- ============================================================

-- Stories
DROP POLICY IF EXISTS "Lectura de historias publicadas" ON public.stories;
CREATE POLICY "Lectura de historias publicadas" ON public.stories FOR SELECT USING (
  estado = 'publicado' OR auth.uid() = author_id OR public.is_admin()
);

DROP POLICY IF EXISTS "Crear historia propia" ON public.stories;
CREATE POLICY "Crear historia propia" ON public.stories FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = author_id AND (es_adulto = false OR declaracion_18_ok = true)
);

DROP POLICY IF EXISTS "Editar historia propia" ON public.stories;
CREATE POLICY "Editar historia propia" ON public.stories FOR UPDATE TO authenticated
USING (auth.uid() = author_id OR public.is_admin())
WITH CHECK (auth.uid() = author_id OR public.is_admin());

DROP POLICY IF EXISTS "Borrar historia propia o admin" ON public.stories;
CREATE POLICY "Borrar historia propia o admin" ON public.stories FOR DELETE TO authenticated
USING (auth.uid() = author_id OR public.is_admin());

-- Comments
-- SELECT: público si no es privado; si es privado, solo el autor del comentario,
-- el autor de la historia, o el admin.
DROP POLICY IF EXISTS "Lectura de comentarios" ON public.comments;
CREATE POLICY "Lectura de comentarios" ON public.comments FOR SELECT USING (
  is_private = false
  OR (user_id IS NOT NULL AND auth.uid() = user_id)
  OR EXISTS (SELECT 1 FROM public.stories WHERE id = comments.story_id AND author_id = auth.uid())
  OR public.is_admin()
);

-- INSERT: A PROPÓSITO no hay ninguna policy de INSERT para anon/authenticated.
-- Con RLS activado, "sin policy" = default deny. Esto obliga a que TODO comentario
-- pase por la Edge Function "verify-comment" (que valida el captcha con Turnstile
-- y después inserta usando la service_role key, la cual ignora RLS por completo).
-- Si en algún momento agregás una policy de INSERT acá, estarías reabriendo el
-- agujero del captcha del lado del cliente.
REVOKE INSERT ON public.comments FROM anon;
REVOKE INSERT ON public.comments FROM authenticated;

DROP POLICY IF EXISTS "Borrar comentarios" ON public.comments;
CREATE POLICY "Borrar comentarios" ON public.comments FOR DELETE USING (
  (user_id IS NOT NULL AND auth.uid() = user_id)
  OR EXISTS (SELECT 1 FROM public.stories WHERE id = comments.story_id AND author_id = auth.uid())
  OR public.is_admin()
);

-- Guardados
DROP POLICY IF EXISTS "Gestionar guardados propios" ON public.guardados;
CREATE POLICY "Gestionar guardados propios" ON public.guardados FOR ALL TO authenticated
USING (auth.uid() = usuario_id) WITH CHECK (auth.uid() = usuario_id);

-- Likes
DROP POLICY IF EXISTS "Lectura pública de likes" ON public.likes;
CREATE POLICY "Lectura pública de likes" ON public.likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Gestionar likes propios" ON public.likes;
CREATE POLICY "Gestionar likes propios" ON public.likes FOR ALL TO authenticated
USING (auth.uid() = usuario_id) WITH CHECK (auth.uid() = usuario_id);

-- Seguidores
DROP POLICY IF EXISTS "Lectura pública de seguidores" ON public.seguidores;
CREATE POLICY "Lectura pública de seguidores" ON public.seguidores FOR SELECT USING (true);

DROP POLICY IF EXISTS "Gestionar seguidores propios" ON public.seguidores;
CREATE POLICY "Gestionar seguidores propios" ON public.seguidores FOR ALL TO authenticated
USING (auth.uid() = seguidor_id) WITH CHECK (auth.uid() = seguidor_id);

-- Reportes
DROP POLICY IF EXISTS "Crear reporte" ON public.reportes;
CREATE POLICY "Crear reporte" ON public.reportes FOR INSERT TO authenticated WITH CHECK (auth.uid() = reportado_por);

DROP POLICY IF EXISTS "Admin lee y gestiona reportes" ON public.reportes;
CREATE POLICY "Admin lee y gestiona reportes" ON public.reportes FOR ALL TO authenticated USING (public.is_admin());

-- Profiles
DROP POLICY IF EXISTS "Lectura pública de perfiles" ON public.profiles;
CREATE POLICY "Lectura pública de perfiles" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Editar propio perfil" ON public.profiles;
CREATE POLICY "Editar propio perfil" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- NUEVO: creación automática del perfil al registrarse (trigger con SECURITY DEFINER,
-- así que no hace falta policy de INSERT para authenticated en profiles).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, split_part(new.email, '@', 1))
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Fondos
DROP POLICY IF EXISTS "Lectura pública de fondos" ON public.fondos_sitio;
CREATE POLICY "Lectura pública de fondos" ON public.fondos_sitio FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin gestiona fondos" ON public.fondos_sitio;
CREATE POLICY "Admin gestiona fondos" ON public.fondos_sitio FOR ALL TO authenticated USING (public.is_admin());

-- ============================================================
-- 5. PERMISOS GENERALES
-- ============================================================
-- Nota: este GRANT es un snapshot de las tablas que existen ahora mismo.
-- Cualquier tabla nueva que agregues más adelante necesita su propio GRANT.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON public.stories, public.profiles, public.likes, public.seguidores, public.fondos_sitio TO anon;

-- comments: SELECT sí (respeta RLS de privados), INSERT no (solo vía Edge Function
-- con service_role). El REVOKE explícito de arriba ya cubrió el INSERT.
GRANT SELECT ON public.comments TO anon;
GRANT SELECT ON public.comments TO authenticated;
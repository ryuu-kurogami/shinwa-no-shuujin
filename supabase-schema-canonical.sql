


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."categoria_enum" AS ENUM (
    'corto',
    'novela',
    'fanfic'
);


ALTER TYPE "public"."categoria_enum" OWNER TO "postgres";


CREATE TYPE "public"."estado_historia_enum" AS ENUM (
    'borrador',
    'pendiente_revision',
    'publicado'
);


ALTER TYPE "public"."estado_historia_enum" OWNER TO "postgres";


CREATE TYPE "public"."motivo_reporte_enum" AS ENUM (
    'plagio_interno',
    'plagio_externo',
    'contenido_prohibido',
    'spam',
    'otro'
);


ALTER TYPE "public"."motivo_reporte_enum" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, split_part(new.email, '@', 1))
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT COALESCE(auth.jwt() ->> 'email', '') IN ('shinwanoshuujin@gmail.com')
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "story_id" "uuid" NOT NULL,
    "commenter_name" "text" DEFAULT 'Lector anónimo'::"text" NOT NULL,
    "text" "text" NOT NULL,
    "is_private" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid"
);


ALTER TABLE "public"."comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fondos_sitio" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tipo" "text" NOT NULL,
    "monto" numeric(10,2) NOT NULL,
    "descripcion" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."fondos_sitio" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."guardados" (
    "usuario_id" "uuid" NOT NULL,
    "historia_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."guardados" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."likes" (
    "usuario_id" "uuid" NOT NULL,
    "historia_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."likes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text" NOT NULL,
    "bio" "text",
    "avatar_url" "text",
    "link_donacion" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reportes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "historia_id" "uuid",
    "comentario_id" "uuid",
    "reportado_por" "uuid",
    "motivo" "public"."motivo_reporte_enum" NOT NULL,
    "evidencia" "text",
    "estado" "text" DEFAULT 'pendiente'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."reportes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."seguidores" (
    "seguidor_id" "uuid" NOT NULL,
    "seguido_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "no_auto_seguir" CHECK (("seguidor_id" <> "seguido_id"))
);


ALTER TABLE "public"."seguidores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "author_id" "uuid" NOT NULL,
    "author_name" "text" NOT NULL,
    "title" "text" NOT NULL,
    "span" "text" DEFAULT 'instante suspendido'::"text" NOT NULL,
    "excerpt" "text" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "portada_url" "text",
    "frase_iconica" character varying(80) DEFAULT 'Instante suspendido'::character varying,
    "categoria" "public"."categoria_enum" DEFAULT 'corto'::"public"."categoria_enum" NOT NULL,
    "es_adulto" boolean DEFAULT false NOT NULL,
    "declaracion_18_ok" boolean DEFAULT false NOT NULL,
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "estado" "public"."estado_historia_enum" DEFAULT 'publicado'::"public"."estado_historia_enum" NOT NULL,
    "lecturas" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."stories" OWNER TO "postgres";


ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fondos_sitio"
    ADD CONSTRAINT "fondos_sitio_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guardados"
    ADD CONSTRAINT "guardados_pkey" PRIMARY KEY ("usuario_id", "historia_id");



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_pkey" PRIMARY KEY ("usuario_id", "historia_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."reportes"
    ADD CONSTRAINT "reportes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."seguidores"
    ADD CONSTRAINT "seguidores_pkey" PRIMARY KEY ("seguidor_id", "seguido_id");



ALTER TABLE ONLY "public"."stories"
    ADD CONSTRAINT "stories_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_comments_story_id" ON "public"."comments" USING "btree" ("story_id");



CREATE INDEX "idx_stories_created_at" ON "public"."stories" USING "btree" ("created_at" DESC);



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."guardados"
    ADD CONSTRAINT "guardados_historia_id_fkey" FOREIGN KEY ("historia_id") REFERENCES "public"."stories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guardados"
    ADD CONSTRAINT "guardados_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_historia_id_fkey" FOREIGN KEY ("historia_id") REFERENCES "public"."stories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reportes"
    ADD CONSTRAINT "reportes_comentario_id_fkey" FOREIGN KEY ("comentario_id") REFERENCES "public"."comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reportes"
    ADD CONSTRAINT "reportes_historia_id_fkey" FOREIGN KEY ("historia_id") REFERENCES "public"."stories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reportes"
    ADD CONSTRAINT "reportes_reportado_por_fkey" FOREIGN KEY ("reportado_por") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."seguidores"
    ADD CONSTRAINT "seguidores_seguido_id_fkey" FOREIGN KEY ("seguido_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."seguidores"
    ADD CONSTRAINT "seguidores_seguidor_id_fkey" FOREIGN KEY ("seguidor_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stories"
    ADD CONSTRAINT "stories_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id");



CREATE POLICY "Admin gestiona fondos" ON "public"."fondos_sitio" TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admin lee y gestiona reportes" ON "public"."reportes" TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Borrar comentarios" ON "public"."comments" FOR DELETE USING (((("user_id" IS NOT NULL) AND ("auth"."uid"() = "user_id")) OR (EXISTS ( SELECT 1
   FROM "public"."stories"
  WHERE (("stories"."id" = "comments"."story_id") AND ("stories"."author_id" = "auth"."uid"())))) OR "public"."is_admin"()));



CREATE POLICY "Borrar historia propia o admin" ON "public"."stories" FOR DELETE TO "authenticated" USING ((("auth"."uid"() = "author_id") OR "public"."is_admin"()));



CREATE POLICY "Crear historia propia" ON "public"."stories" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "author_id") AND (("es_adulto" = false) OR ("declaracion_18_ok" = true))));



CREATE POLICY "Crear reporte" ON "public"."reportes" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "reportado_por"));



CREATE POLICY "Editar historia propia" ON "public"."stories" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "author_id") OR "public"."is_admin"())) WITH CHECK ((("auth"."uid"() = "author_id") OR "public"."is_admin"()));



CREATE POLICY "Editar propio perfil" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Gestionar guardados propios" ON "public"."guardados" TO "authenticated" USING (("auth"."uid"() = "usuario_id")) WITH CHECK (("auth"."uid"() = "usuario_id"));



CREATE POLICY "Gestionar likes propios" ON "public"."likes" TO "authenticated" USING (("auth"."uid"() = "usuario_id")) WITH CHECK (("auth"."uid"() = "usuario_id"));



CREATE POLICY "Gestionar seguidores propios" ON "public"."seguidores" TO "authenticated" USING (("auth"."uid"() = "seguidor_id")) WITH CHECK (("auth"."uid"() = "seguidor_id"));



CREATE POLICY "Lectura de comentarios" ON "public"."comments" FOR SELECT USING ((("is_private" = false) OR (("user_id" IS NOT NULL) AND ("auth"."uid"() = "user_id")) OR (EXISTS ( SELECT 1
   FROM "public"."stories"
  WHERE (("stories"."id" = "comments"."story_id") AND ("stories"."author_id" = "auth"."uid"())))) OR "public"."is_admin"()));



CREATE POLICY "Lectura de historias publicadas" ON "public"."stories" FOR SELECT USING ((("estado" = 'publicado'::"public"."estado_historia_enum") OR ("auth"."uid"() = "author_id") OR "public"."is_admin"()));



CREATE POLICY "Lectura pública de fondos" ON "public"."fondos_sitio" FOR SELECT USING (true);



CREATE POLICY "Lectura pública de likes" ON "public"."likes" FOR SELECT USING (true);



CREATE POLICY "Lectura pública de perfiles" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Lectura pública de seguidores" ON "public"."seguidores" FOR SELECT USING (true);



ALTER TABLE "public"."comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fondos_sitio" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."guardados" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reportes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."seguidores" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stories" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";





































































































































































GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."comments" TO "anon";
GRANT ALL ON TABLE "public"."comments" TO "authenticated";
GRANT ALL ON TABLE "public"."comments" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."fondos_sitio" TO "anon";
GRANT ALL ON TABLE "public"."fondos_sitio" TO "authenticated";
GRANT ALL ON TABLE "public"."fondos_sitio" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."guardados" TO "anon";
GRANT ALL ON TABLE "public"."guardados" TO "authenticated";
GRANT ALL ON TABLE "public"."guardados" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."likes" TO "anon";
GRANT ALL ON TABLE "public"."likes" TO "authenticated";
GRANT ALL ON TABLE "public"."likes" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."reportes" TO "anon";
GRANT ALL ON TABLE "public"."reportes" TO "authenticated";
GRANT ALL ON TABLE "public"."reportes" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."seguidores" TO "anon";
GRANT ALL ON TABLE "public"."seguidores" TO "authenticated";
GRANT ALL ON TABLE "public"."seguidores" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."stories" TO "anon";
GRANT ALL ON TABLE "public"."stories" TO "authenticated";
GRANT ALL ON TABLE "public"."stories" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "service_role";




































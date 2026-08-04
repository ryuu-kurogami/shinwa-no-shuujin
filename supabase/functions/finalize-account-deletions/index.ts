// supabase/functions/finalize-account-deletions/index.ts
import { createClient } from '@supabase/supabase-js'

// Esta función NO la llama el navegador de un usuario — la dispara un cron
// de la base (pg_cron + pg_net) una vez por día. Por eso no valida un JWT de
// usuario: valida un secreto compartido que solo la base conoce.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const secret = req.headers.get('x-cron-secret')
  if (!secret || secret !== Deno.env.get('CRON_SECRET')) {
    return jsonResponse({ error: 'No autorizado' }, 401)
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Cuentas cuyo período de gracia de 60 días ya venció
  const { data: vencidas, error: errBuscar } = await supabase
    .from('profiles')
    .select('id')
    .not('eliminar_en', 'is', null)
    .lte('eliminar_en', new Date().toISOString())

  if (errBuscar) {
    return jsonResponse({ error: errBuscar.message }, 500)
  }

  const resultados: { id: string; ok: boolean; error?: string }[] = []

  for (const { id: userId } of vencidas || []) {
    try {
      // 1. Anonimizar sus comentarios en historias ajenas (nombre Y texto —
      //    no alcanza con vaciar el user_id, así no queda contenido real
      //    de alguien que pidió que se borren sus datos).
      const { error: errComentarios } = await supabase
        .from('comments')
        .update({ commenter_name: 'Usuario eliminado', text: '[Comentario eliminado]' })
        .eq('user_id', userId)
      if (errComentarios) throw errComentarios

      // 2. Borrar sus historias (se lleva en cascada comentarios de esas
      //    historias, reportes y likes/guardados asociados).
      const { error: errHistorias } = await supabase.from('stories').delete().eq('author_id', userId)
      if (errHistorias) throw errHistorias

      // 3. Borrar la cuenta de Auth — el resto (profiles, guardados, likes,
      //    seguidores, admin_users) se borra solo por ON DELETE CASCADE.
      const { error: errAuth } = await supabase.auth.admin.deleteUser(userId)
      if (errAuth) throw errAuth

      resultados.push({ id: userId, ok: true })
    } catch (err) {
      resultados.push({ id: userId, ok: false, error: err instanceof Error ? err.message : 'Error desconocido' })
    }
  }

  return jsonResponse({ procesadas: resultados.length, resultados }, 200)
})
// supabase/functions/ban-user-auth/index.ts
import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// NOTA IMPORTANTE: la API de administración de Supabase Auth no tiene un
// "permanente" literal — se emula con una duración muy larga. Este valor
// no está verificado contra documentación en vivo (no hay acceso a
// internet desde este entorno); probar primero con una cuenta de prueba
// antes de confiar en esto para un usuario real.
const DURACION_PERMANENTE = '876000h' // ~100 años

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

  try {
    const { target_user_id, accion } = await req.json() // accion: 'banear' | 'desbanear'

    if (!target_user_id || !['banear', 'desbanear'].includes(accion)) {
      return jsonResponse({ error: 'Datos incompletos' }, 400)
    }

    // --- Verificar que quien llama es realmente un admin — nunca confiar
    // en lo que diga el cliente, se valida el JWT y se chequea is_admin()
    // del lado del servidor, igual que en el resto de las funciones.
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ error: 'No autorizado' }, 401)
    }

    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: userData, error: userError } = await anonClient.auth.getUser()
    if (userError || !userData?.user) {
      return jsonResponse({ error: 'No autorizado' }, 401)
    }

    const { data: esAdmin, error: errAdmin } = await anonClient.rpc('is_admin')
    if (errAdmin) {
      console.error('Error consultando is_admin:', errAdmin.message)
      return jsonResponse({ error: 'Error interno al validar permisos.' }, 500)
    }
    if (!esAdmin) {
      return jsonResponse({ error: 'No autorizado' }, 403)
    }

    // --- Banear/desbanear en Auth con service_role ---
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { error: errBan } = await supabase.auth.admin.updateUserById(target_user_id, {
      ban_duration: accion === 'banear' ? DURACION_PERMANENTE : 'none',
    })

    if (errBan) {
      console.error('Error al banear/desbanear en Auth:', errBan.message)
      return jsonResponse({ error: errBan.message }, 400)
    }

    return jsonResponse({ ok: true }, 200)
  } catch (_err) {
    return jsonResponse({ error: 'Error interno' }, 500)
  }
})
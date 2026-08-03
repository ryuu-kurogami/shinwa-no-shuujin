// supabase/functions/verify-comment/index.ts
import { createClient } from '@supabase/supabase-js'

// En producción, reemplazá '*' por tu dominio real de Vercel para más seguridad,
// ej: 'https://shinwa-no-shuujin.vercel.app'
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  // El navegador manda un preflight OPTIONS antes del POST real — hay que responderlo
  // explícitamente o el POST nunca sale.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { token, story_id, text, is_private, commenter_name } = await req.json()

    // --- 0. Validaciones básicas de entrada ---
    if (!token || !story_id || !text || typeof text !== 'string' || !text.trim()) {
      return new Response(JSON.stringify({ error: 'Datos incompletos' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (text.length > 2000) {
      return new Response(JSON.stringify({ error: 'Comentario demasiado largo' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // --- 1. Validar el captcha con Cloudflare (siteverify) ---
    const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: Deno.env.get('TURNSTILE_SECRET_KEY'),
        response: token,
      }),
    })
    const verifyResult = await verify.json()

    if (!verifyResult.success) {
      return new Response(JSON.stringify({ error: 'Captcha inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // --- 2. Resolver el usuario REAL a partir del JWT, nunca del body ---
    // Si el usuario está logueado, el cliente de Supabase manda el JWT en el header
    // Authorization automáticamente. Lo leemos con un cliente "anon" para verificarlo
    // de forma segura (getUser valida la firma contra Supabase Auth).
    const authHeader = req.headers.get('Authorization')
    let verifiedUserId: string | null = null

    if (authHeader) {
      const anonClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      )
      const { data: userData, error: userError } = await anonClient.auth.getUser()
      if (!userError && userData?.user) {
        verifiedUserId = userData.user.id
      }
    }

    // Si mandaron nombre pero no hay usuario verificado, es un comentario anónimo real
    const safeCommenterName = verifiedUserId
      ? (commenter_name || 'Usuario')
      : 'Lector anónimo'

    // --- 3. Cliente con service_role (ignora RLS, pero ya validamos todo arriba) ---
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // --- 3.1 Bloquear si el usuario tiene un baneo vigente ---
    if (verifiedUserId) {
      const { data: isBanned } = await supabase.rpc('is_baneado', { p_user_id: verifiedUserId })
      if (isBanned) {
        return new Response(JSON.stringify({ error: 'Tu cuenta tiene una restricción activa.' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const { data, error } = await supabase.from('comments').insert({
      story_id,
      text: text.trim(),
      is_private: !!is_private,
      commenter_name: safeCommenterName,
      user_id: verifiedUserId, // NUNCA el user_id que venga del body
    })

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (_err) {
    return new Response(JSON.stringify({ error: 'Error interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

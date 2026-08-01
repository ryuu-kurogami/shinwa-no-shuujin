// supabase/functions/verify-comment/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req: Request) => {
  try {
    const { token, story_id, text, is_private, commenter_name } = await req.json()

    // --- 0. Validaciones básicas de entrada ---
    if (!token || !story_id || !text || typeof text !== 'string' || !text.trim()) {
      return new Response(JSON.stringify({ error: 'Datos incompletos' }), { status: 400 })
    }
    if (text.length > 2000) {
      return new Response(JSON.stringify({ error: 'Comentario demasiado largo' }), { status: 400 })
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
      return new Response(JSON.stringify({ error: 'Captcha inválido' }), { status: 400 })
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

    // --- 3. Insertar con service_role (ignora RLS, pero ya validamos todo arriba) ---
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data, error } = await supabase.from('comments').insert({
      story_id,
      text: text.trim(),
      is_private: !!is_private,
      commenter_name: safeCommenterName,
      user_id: verifiedUserId, // NUNCA el user_id que venga del body
    })

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 })
    }

    return new Response(JSON.stringify({ data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Error interno' }), { status: 500 })
  }
})
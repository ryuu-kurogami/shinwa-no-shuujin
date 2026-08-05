// supabase/functions/verify-comment/index.ts
import { createClient } from '@supabase/supabase-js'

// En producción, reemplazá '*' por tu dominio real de Vercel para más seguridad,
// ej: 'https://shinwa-no-shuujin.vercel.app'
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Rate limiting (Términos, Sección 6.3): límites separados por usuario y por
// IP. El de IP es la defensa contra alguien que se banea y vuelve con otra
// cuenta desde la misma conexión.
const COOLDOWN_SEGUNDOS = 15 // no se puede mandar dos comentarios más rápido que esto
const MAX_POR_USUARIO_POR_HORA = 20
const MAX_POR_IP_POR_HORA = 30

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function obtenerIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('cf-connecting-ip') || 'desconocida'
}

Deno.serve(async (req: Request) => {
  // El navegador manda un preflight OPTIONS antes del POST real — hay que responderlo
  // explícitamente o el POST nunca sale.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { token, capitulo_id, text, is_private, is_anonymous } = await req.json()

    // --- 0. Validaciones básicas de entrada ---
    if (!token || !capitulo_id || !text || typeof text !== 'string' || !text.trim()) {
      return jsonResponse({ error: 'Datos incompletos' }, 400)
    }
    if (text.length > 2000) {
      return jsonResponse({ error: 'Comentario demasiado largo' }, 400)
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
      return jsonResponse({ error: 'Captcha inválido' }, 400)
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

    // Comentar requiere cuenta (Términos, Secciones 2.1 y 6.1) — si no hay
    // JWT válido, no seguimos. Si en algún momento se decide permitir
    // comentarios sin cuenta, este es el único bloque a sacar.
    if (!verifiedUserId) {
      return jsonResponse({ error: 'Necesitás una cuenta para comentar.' }, 401)
    }

    // --- 3. Cliente con service_role (ignora RLS, pero ya validamos todo arriba) ---
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

   // --- 3.05 Validar capítulo existente y publicado ---
const { data: capitulo } = await supabase
  .from('capitulos')
  .select('story_id, estado')
  .eq('id', capitulo_id)
  .maybeSingle()

if (!capitulo || capitulo.estado !== 'publicado') {
  return jsonResponse({ error: 'Ese capítulo no está disponible para comentar.' }, 400)
}

const story_id = capitulo.story_id
    // --- 3.1 Bloquear si el usuario tiene un baneo vigente ---
    const { data: isBanned } = await supabase.rpc('is_baneado', { p_user_id: verifiedUserId })
    if (isBanned) {
      return jsonResponse({ error: 'Tu cuenta tiene una restricción activa.' }, 403)
    }

    // --- 3.2 Rate limiting: cooldown + tope por hora (usuario e IP) ---
    const ip = obtenerIp(req)
    const desdeCooldown = new Date(Date.now() - COOLDOWN_SEGUNDOS * 1000).toISOString()
    const desdeHora = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    const { data: ultimoComentario } = await supabase
      .from('comments')
      .select('created_at')
      .eq('user_id', verifiedUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (ultimoComentario && ultimoComentario.created_at > desdeCooldown) {
      return jsonResponse({ error: 'Estás comentando muy rápido. Esperá unos segundos.' }, 429)
    }

    const { count: countUsuario } = await supabase
      .from('comments')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', verifiedUserId)
      .gt('created_at', desdeHora)

    if ((countUsuario ?? 0) >= MAX_POR_USUARIO_POR_HORA) {
      return jsonResponse({ error: 'Alcanzaste el límite de comentarios por hora.' }, 429)
    }

    if (ip !== 'desconocida') {
      const { count: countIp } = await supabase
        .from('comments')
        .select('id', { count: 'exact', head: true })
        .eq('ip_address', ip)
        .gt('created_at', desdeHora)

      if ((countIp ?? 0) >= MAX_POR_IP_POR_HORA) {
        return jsonResponse({ error: 'Alcanzaste el límite de comentarios por hora.' }, 429)
      }
    }

    // --- 4. Nombre a mostrar: SIEMPRE resuelto server-side, nunca del body ---
    // El cliente solo puede pedir "anónimo" o "identificado" — jamás mandar
    // un texto. Así no hay forma de firmar un comentario con el nombre de
    // otro usuario, ni siquiera llamando a esta función directo.
    let safeCommenterName = 'Anónimo'
    if (!is_anonymous) {
      const { data: perfil } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', verifiedUserId)
        .maybeSingle()
      safeCommenterName = perfil?.username || 'Usuario'
    }

    const { data, error } = await supabase.from('comments').insert({
      story_id,
      capitulo_id,
      text: text.trim(),
      is_private: !!is_private,
      commenter_name: safeCommenterName,
      user_id: verifiedUserId, // NUNCA el user_id que venga del body
      ip_address: ip !== 'desconocida' ? ip : null,
    })

    if (error) {
      return jsonResponse({ error: error.message }, 400)
    }

    return jsonResponse({ data }, 200)
  } catch (_err) {
    return jsonResponse({ error: 'Error interno' }, 500)
  }
})
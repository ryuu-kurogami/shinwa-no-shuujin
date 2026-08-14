// supabase/functions/submit-report/index.ts
import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MOTIVOS_VALIDOS = ['contenido_prohibido', 'plagio_interno', 'plagio_externo', 'spam', 'otro']

// Reportar no exige cuenta (Términos, Sección 7.2 — "cualquier persona,
// sea o no el autor original, puede reportar"), así que la única defensa
// contra uso indiscriminado es el captcha + este rate limiting por IP.
const COOLDOWN_SEGUNDOS = 30
const MAX_POR_IP_POR_HORA = 10

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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { token, historia_id, comentario_id, capitulo_id, motivo, evidencia, evidencia_imagen_url, contacto_email } = await req.json()

    // --- 0. Validaciones básicas ---
    if (!token || !motivo || (!historia_id && !comentario_id)) {
      return jsonResponse({ error: 'Datos incompletos' }, 400)
    }
    if (!MOTIVOS_VALIDOS.includes(motivo)) {
      return jsonResponse({ error: 'Motivo inválido' }, 400)
    }
    if (evidencia && typeof evidencia === 'string' && evidencia.length > 2000) {
      return jsonResponse({ error: 'La evidencia es demasiado larga' }, 400)
    }

    // --- 1. Captcha (Cloudflare Turnstile) ---
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

    // --- 2. Usuario opcional — si hay JWT válido, se guarda; si no, el
    // reporte queda anónimo (reportado_por = null). Nunca se toma del body.
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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // --- 3. Si está logueado y baneado, no puede reportar ---
    if (verifiedUserId) {
      const { data: isBanned, error: errBaneo } = await supabase.rpc('is_baneado', { p_user_id: verifiedUserId })
      if (errBaneo) {
        console.error('Error consultando is_baneado:', errBaneo.message)
        return jsonResponse({ error: 'Error interno al validar la cuenta.' }, 500)
      }
      if (isBanned) {
        return jsonResponse({ error: 'Tu cuenta tiene una restricción activa.' }, 403)
      }
    }

    // --- 4. No dejar que la misma cuenta (o la misma IP, si es anónimo)
    // reporte el mismo objetivo dos veces mientras el primer reporte siga
    // pendiente — evita inflar la cola con duplicados del mismo reportante.
    let dupQuery = supabase.from('reportes').select('id').eq('estado', 'pendiente').limit(1)
    if (comentario_id) {
      dupQuery = dupQuery.eq('comentario_id', comentario_id)
    } else if (capitulo_id) {
      dupQuery = dupQuery.eq('historia_id', historia_id).eq('capitulo_id', capitulo_id)
    } else {
      dupQuery = dupQuery.eq('historia_id', historia_id)
    }
    dupQuery = verifiedUserId
      ? dupQuery.eq('reportado_por', verifiedUserId)
      : dupQuery.is('reportado_por', null)

    const ipParaDedupe = obtenerIp(req)
    if (!verifiedUserId && ipParaDedupe !== 'desconocida') {
      dupQuery = dupQuery.eq('ip_address', ipParaDedupe)
    }

    const { data: duplicado } = await dupQuery.maybeSingle()
    if (duplicado) {
      return jsonResponse({ error: 'Ya enviaste un reporte para esto — está pendiente de revisión.' }, 409)
    }

    // --- 5. Rate limiting por IP — aplica con o sin cuenta, es la defensa
    // real contra usar reportes para tumbar cuentas legítimas en masa.
    const ip = obtenerIp(req)
    if (ip !== 'desconocida') {
      const desdeCooldown = new Date(Date.now() - COOLDOWN_SEGUNDOS * 1000).toISOString()
      const desdeHora = new Date(Date.now() - 60 * 60 * 1000).toISOString()

      const { data: ultimoReporte } = await supabase
        .from('reportes')
        .select('created_at')
        .eq('ip_address', ip)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (ultimoReporte && ultimoReporte.created_at > desdeCooldown) {
        return jsonResponse({ error: 'Estás reportando muy rápido. Esperá un momento.' }, 429)
      }

      const { count } = await supabase
        .from('reportes')
        .select('id', { count: 'exact', head: true })
        .eq('ip_address', ip)
        .gt('created_at', desdeHora)

      if ((count ?? 0) >= MAX_POR_IP_POR_HORA) {
        return jsonResponse({ error: 'Alcanzaste el límite de reportes por hora.' }, 429)
      }
    }

    if (evidencia_imagen_url && typeof evidencia_imagen_url === 'string' && !evidencia_imagen_url.startsWith('https://')) {
      return jsonResponse({ error: 'Evidencia de imagen inválida' }, 400)
    }
    if (contacto_email && typeof contacto_email === 'string' && !contacto_email.includes('@')) {
      return jsonResponse({ error: 'Correo de contacto inválido' }, 400)
    }

    const { data, error } = await supabase.from('reportes').insert({
      historia_id: historia_id || null,
      comentario_id: comentario_id || null,
      capitulo_id: capitulo_id || null,
      reportado_por: verifiedUserId, // null si es anónimo — NUNCA del body
      motivo,
      evidencia: typeof evidencia === 'string' ? evidencia.trim() || null : null,
      evidencia_imagen_url: typeof evidencia_imagen_url === 'string' ? evidencia_imagen_url.trim() || null : null,
      contacto_email: typeof contacto_email === 'string' ? contacto_email.trim() || null : null,
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
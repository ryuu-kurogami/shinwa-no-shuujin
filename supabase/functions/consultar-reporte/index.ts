// supabase/functions/consultar-reporte/index.ts
import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Mismo criterio de rate limiting que submit-report — acá la defensa es
// aún más importante, porque esto es exactamente la superficie que
// alguien intentaría usar para adivinar códigos a fuerza bruta.
const COOLDOWN_SEGUNDOS = 5
const MAX_POR_IP_POR_HORA = 20

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

async function hashCodigo(codigo: string): Promise<string> {
  const data = new TextEncoder().encode(codigo)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

const ESTADO_LABEL: Record<string, string> = {
  pendiente: 'Tu reporte todavía está pendiente de revisión.',
  resuelto: 'Tu reporte fue revisado y resuelto.',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { codigo } = await req.json()

    if (!codigo || typeof codigo !== 'string' || codigo.trim().length < 4) {
      return jsonResponse({ error: 'Código inválido.' }, 400)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // --- Rate limiting por IP, igual que submit-report ---
    const ip = obtenerIp(req)
    if (ip !== 'desconocida') {
      const desdeCooldown = new Date(Date.now() - COOLDOWN_SEGUNDOS * 1000).toISOString()
      const desdeHora = new Date(Date.now() - 60 * 60 * 1000).toISOString()

      const { data: ultimoIntento } = await supabase
        .from('intentos_consulta_reporte')
        .select('created_at')
        .eq('ip_address', ip)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (ultimoIntento && ultimoIntento.created_at > desdeCooldown) {
        return jsonResponse({ error: 'Esperá un momento antes de volver a intentar.' }, 429)
      }

      const { count } = await supabase
        .from('intentos_consulta_reporte')
        .select('id', { count: 'exact', head: true })
        .eq('ip_address', ip)
        .gt('created_at', desdeHora)

      if ((count ?? 0) >= MAX_POR_IP_POR_HORA) {
        return jsonResponse({ error: 'Alcanzaste el límite de consultas por hora.' }, 429)
      }

      // Se registra el intento ANTES de resolver la consulta, así cuenta
      // tanto si el código es válido como si no.
      await supabase.from('intentos_consulta_reporte').insert({ ip_address: ip })
    }

    const hash = await hashCodigo(codigo.trim().toUpperCase())

    const { data: reporte } = await supabase
      .from('reportes')
      .select('estado, motivo, created_at')
      .eq('codigo_seguimiento_hash', hash)
      .maybeSingle()

    if (!reporte) {
      // Mismo mensaje genérico exista o no el código — no confirmar ni
      // descartar nada más para no dar pistas.
      return jsonResponse({ error: 'No encontramos ningún reporte con ese código.' }, 404)
    }

    // Solo se devuelve el estado y datos del propio reporte — nunca nada
    // sobre el contenido reportado, el acusado, ni evidencia ajena.
    return jsonResponse(
      {
        estado: reporte.estado,
        mensaje: ESTADO_LABEL[reporte.estado] || 'Tu reporte fue procesado.',
        creado_en: reporte.created_at,
      },
      200
    )
  } catch (_err) {
    return jsonResponse({ error: 'Error interno' }, 500)
  }
})
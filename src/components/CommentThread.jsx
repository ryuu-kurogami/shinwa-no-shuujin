import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'

// Reemplazá por tu site key real de Cloudflare Turnstile (esta sí es pública, va en el frontend sin problema)
const TURNSTILE_SITE_KEY = '0x4AAAAAAECIafgcYBU-aIn7'

export default function CommentThread({ storyId, currentUser: currentUserProp }) {
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [showUsername, setShowUsername] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [currentUser, setCurrentUser] = useState(currentUserProp ?? null)
  const [turnstileToken, setTurnstileToken] = useState(null)

  const turnstileRef = useRef(null)     // el <div> donde se monta el widget
  const widgetIdRef = useRef(null)      // id que devuelve turnstile.render, para poder resetear

  // --- Usuario: si no vino por props, lo resolvemos con la sesión de Supabase ---
  useEffect(() => {
    if (currentUserProp) {
      setCurrentUser(currentUserProp)
      return
    }
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUser(data?.user ?? null)
    })
  }, [currentUserProp])

  // --- Cargar comentarios de esta historia ---
  const refreshComments = async () => {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('story_id', storyId)
      .order('created_at', { ascending: false })

    if (!error) setComments(data ?? [])
  }

  useEffect(() => {
    refreshComments()
  }, [storyId])

  // --- Montar el widget de Turnstile (el script global ya está en index.html) ---
  useEffect(() => {
    if (!turnstileRef.current) return

    const renderWidget = () => {
      if (!window.turnstile || widgetIdRef.current) return
      widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (token) => setTurnstileToken(token),
        'expired-callback': () => setTurnstileToken(null),
        'error-callback': () => setTurnstileToken(null),
      })
    }

    if (window.turnstile) {
      renderWidget()
    } else {
      // el script tiene async/defer, puede no estar listo todavía
      const interval = setInterval(() => {
        if (window.turnstile) {
          renderWidget()
          clearInterval(interval)
        }
      }, 200)
      return () => clearInterval(interval)
    }
  }, [])

  const resetTurnstile = () => {
    setTurnstileToken(null)
    if (window.turnstile && widgetIdRef.current) {
      window.turnstile.reset(widgetIdRef.current)
    }
  }

  // --- Envío del comentario ---
  const handleSubmitComment = async (e) => {
    e.preventDefault()

    if (!commentText.trim()) {
      setError('Escribí algo antes de enviar.')
      return
    }
    if (!turnstileToken) {
      setError('Completá la verificación anti-bots.')
      return
    }

    setLoading(true)
    setError(null)

    const displayName = currentUser
      ? (showUsername
          ? (currentUser.user_metadata?.username || currentUser.email)
          : 'Lector anónimo')
      : 'Lector anónimo'

    const { data, error } = await supabase.functions.invoke('verify-comment', {
      body: {
        token: turnstileToken,
        story_id: storyId,
        text: commentText,
        is_private: isPrivate,
        commenter_name: displayName,
        user_id: currentUser?.id ?? null,
      },
    })

    setLoading(false)

    if (error) {
      setError('No se pudo enviar el comentario. Intentá de nuevo.')
      resetTurnstile()
      return
    }

    setCommentText('')
    refreshComments()
    resetTurnstile()
  }

  return (
    <div className="comment-thread">
      <h3>Comentarios</h3>

      <form onSubmit={handleSubmitComment} className="comment-form">
        <textarea
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Escribí un comentario..."
          rows={3}
        />

        <div className="comment-form-options">
          {currentUser && (
            <label>
              <input
                type="checkbox"
                checked={showUsername}
                onChange={(e) => setShowUsername(e.target.checked)}
              />
              Comentar como {currentUser.user_metadata?.username || currentUser.email}
            </label>
          )}

          <label>
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
            />
            Comentario privado (solo lo ve el autor)
          </label>
        </div>

        {/* Widget de Cloudflare Turnstile — se monta acá */}
        <div ref={turnstileRef} className="turnstile-widget" />

        {error && <p className="comment-error">{error}</p>}

        <button type="submit" disabled={loading || !turnstileToken}>
          {loading ? 'Enviando...' : 'Comentar'}
        </button>
      </form>

      <ul className="comment-list">
        {comments.map((c) => (
          <li key={c.id} className={c.is_private ? 'comment-private' : ''}>
            <strong>{c.commenter_name}</strong>
            {c.is_private && <span className="badge-private">Privado</span>}
            <p>{c.text}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

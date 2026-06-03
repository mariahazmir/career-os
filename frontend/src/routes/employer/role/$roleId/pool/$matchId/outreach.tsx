import { createFileRoute, redirect, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState, useRef } from 'react'
import { api } from '../../../../../../lib/api'

export const Route = createFileRoute('/employer/role/$roleId/pool/$matchId/outreach')({
  beforeLoad: ({ context }) => {
    if (!context.auth.session) throw redirect({ to: '/login' })
  },
  component: OutreachPage,
})

interface OutreachMessage {
  id: string
  draft_text: string
  final_text: string | null
  employer_edited: boolean
  character_count: number | null
  delivery_status: string
  sent_at: string | null
}

function OutreachPage() {
  const { roleId, matchId } = Route.useParams()
  const navigate = useNavigate()
  const [message, setMessage] = useState<OutreachMessage | null>(null)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const originalDraft = useRef('')

  useEffect(() => {
    api.get<OutreachMessage>(`/outreach/${matchId}`)
      .then((msg) => {
        setMessage(msg)
        const initial = msg.final_text ?? msg.draft_text
        setText(initial)
        originalDraft.current = msg.draft_text
        if (msg.delivery_status === 'sent') setSent(true)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [matchId])

  const charCount = text.length
  const isOverLimit = charCount > 400
  const isEdited = text !== originalDraft.current

  async function handleSend() {
    setSending(true)
    setError(null)
    try {
      if (isEdited) {
        await api.patch(`/outreach/${matchId}`, { final_text: text })
      }
      await api.post(`/outreach/${matchId}/send`, {})
      setSent(true)
      setTimeout(() => {
        navigate({ to: '/employer/role/$roleId/pool', params: { roleId } })
      }, 1800)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (error && !message) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-red-600 text-sm">{error}</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/employer/role/$roleId/pool/$matchId"
            params={{ roleId, matchId }}
            className="text-sm text-gray-400 hover:text-gray-700"
          >
            ← Back
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-medium text-gray-900">Outreach message</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-6">
        {sent ? (
          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Message queued</h2>
            <p className="text-sm text-gray-500">The candidate will receive this when they accept the match.</p>
            <p className="text-xs text-gray-400 mt-3">Redirecting to pool…</p>
          </div>
        ) : (
          <>
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-base font-semibold text-gray-900">Review outreach message</h1>
                <span className={`text-sm font-medium tabular-nums ${isOverLimit ? 'text-red-500' : charCount > 360 ? 'text-amber-500' : 'text-gray-400'}`}>
                  {charCount} / 400
                </span>
              </div>

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={6}
                disabled={sending}
                className={`w-full border rounded-lg px-4 py-3 text-sm text-gray-800 leading-relaxed resize-none focus:outline-none focus:ring-2 transition-colors ${
                  isOverLimit
                    ? 'border-red-300 focus:ring-red-200'
                    : 'border-gray-200 focus:ring-indigo-200'
                }`}
              />

              {isOverLimit && (
                <p className="text-xs text-red-500 mt-2">
                  {charCount - 400} characters over the limit — shorten before sending.
                </p>
              )}

              {message?.employer_edited && !isEdited && (
                <p className="text-xs text-indigo-500 mt-2">Your edits are saved.</p>
              )}

              {isEdited && (
                <p className="text-xs text-gray-400 mt-2">
                  Editing from the AI draft.{' '}
                  <button
                    type="button"
                    onClick={() => setText(originalDraft.current)}
                    className="text-indigo-500 hover:underline"
                  >
                    Restore original
                  </button>
                </p>
              )}
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 leading-relaxed">
                This message is delivered to the candidate after they accept the match — not immediately.
                The candidate controls whether to engage further.
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <div className="flex gap-3">
              <Link
                to="/employer/role/$roleId/pool/$matchId"
                params={{ roleId, matchId }}
                className="flex-1 text-center border border-gray-300 text-gray-700 rounded-lg py-2.5 text-sm hover:bg-gray-50 transition-colors"
              >
                Back to candidate
              </Link>
              <button
                type="button"
                onClick={handleSend}
                disabled={sending || isOverLimit}
                className="flex-1 bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {sending ? 'Sending…' : isEdited ? 'Save & send' : 'Send as written'}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

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
    <div className="cos-page flex items-center justify-center">
      <div className="cos-aurora-role" />
      <div className="cos-layer flex flex-col items-center gap-4">
        <div className="cos-spinner w-10 h-10 border-[3px]" />
        <p className="text-[14px] text-[var(--tx-dim)]">Loading…</p>
      </div>
    </div>
  )

  if (error && !message) return (
    <div className="cos-page flex items-center justify-center">
      <div className="cos-aurora-role" />
      <div className="cos-layer">
        <p className="text-[13.5px] text-[var(--red)]">{error}</p>
      </div>
    </div>
  )

  return (
    <div className="cos-page">
      <div className="cos-aurora-role" />
      <div className="cos-layer">
        <header className="cos-appbar">
          <div className="cos-brand">
            <div className="cos-brand-mark"><div className="cos-brand-tri" /></div>
            Career<span className="cos-brand-sub">OS</span>
          </div>
          <div className="flex-1" />
          <Link
            to="/employer/role/$roleId/pool/$matchId"
            params={{ roleId, matchId }}
            className="cos-back"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
            Back to candidate
          </Link>
        </header>

        <main className="max-w-[620px] mx-auto px-6 pb-20 pt-4 flex flex-col gap-5">
          {sent ? (
            <div className="cos-card p-14 text-center flex flex-col items-center gap-5">
              <div className="w-14 h-14 rounded-full bg-[var(--teal-soft)] border border-[rgba(111,198,194,0.3)] flex items-center justify-center">
                <svg className="w-7 h-7 text-[var(--teal)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h2 className="text-[20px] font-semibold text-[var(--tx)] tracking-tight mb-1.5">Message queued</h2>
                <p className="text-[14px] text-[var(--tx-dim)]">The candidate will receive this when they accept the match.</p>
                <p className="text-[12px] text-[var(--tx-mute)] mt-2.5">Redirecting to pool…</p>
              </div>
            </div>
          ) : (
            <>
              <div>
                <div className="cos-eyebrow-orange mb-3">Outreach message</div>
                <h1 className="cos-h1 m-0">Review before sending</h1>
                <p className="text-[14.5px] text-[var(--tx-dim)] mt-3 leading-relaxed max-w-[52ch]">
                  This message is delivered after the candidate accepts — not immediately. Edit freely; the 400-character limit keeps it human.
                </p>
              </div>

              <div className="cos-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[13px] font-semibold text-[var(--tx-dim)] uppercase tracking-wider">Draft</p>
                  <span className={`text-[13px] font-semibold tabular-nums ${isOverLimit ? 'text-[var(--red)]' : charCount > 360 ? 'text-[var(--orange)]' : 'text-[var(--tx-mute)]'}`}>
                    {charCount} / 400
                  </span>
                </div>

                <div className={`cos-textarea-soft ${isOverLimit ? '[border-color:var(--red)]' : ''}`}>
                  <textarea
                    aria-label="Outreach message text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={6}
                    disabled={sending}
                  />
                </div>

                {isOverLimit && (
                  <p className="text-[12.5px] text-[var(--red)] mt-2">
                    {charCount - 400} characters over the limit — shorten before sending.
                  </p>
                )}

                {message?.employer_edited && !isEdited && (
                  <p className="text-[12px] text-[var(--teal)] mt-2">Your edits are saved.</p>
                )}

                {isEdited && (
                  <p className="text-[12px] text-[var(--tx-mute)] mt-2">
                    Editing from the AI draft.{' '}
                    <button
                      type="button"
                      onClick={() => setText(originalDraft.current)}
                      className="text-[var(--orange)] hover:underline bg-transparent border-none cursor-pointer font-inherit text-[12px] p-0"
                    >
                      Restore original
                    </button>
                  </p>
                )}
              </div>

              <div className="cos-explainer">
                <div className="cos-explainer-icon">
                  <svg className="w-[17px] h-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <span>Delivered only after the candidate opts in. They control whether to engage further.</span>
              </div>

              {error && <p className="text-[13px] text-[var(--red)]">{error}</p>}

              <div className="flex gap-3">
                <Link
                  to="/employer/role/$roleId/pool/$matchId"
                  params={{ roleId, matchId }}
                  className="cos-btn-ghost flex-1 text-center"
                >
                  Back to candidate
                </Link>
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={sending || isOverLimit}
                  className="cos-btn-orange flex-1 disabled:opacity-50"
                >
                  {sending ? 'Sending…' : isEdited ? 'Save & send' : 'Send as written'}
                  {!sending && (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                  )}
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

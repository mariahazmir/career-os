import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { db } from '../db/client.js'
import { getEmployerContext, logEvent } from '../middleware/auth.js'

export const outreachRouter = new Hono()

// GET /outreach/:matchId — fetch outreach message for a match
outreachRouter.get('/:matchId', async (c) => {
  await getEmployerContext(c)
  const matchId = c.req.param('matchId')

  const { data: message, error } = await db
    .from('outreach_message')
    .select('*')
    .eq('match_id', matchId)
    .single()

  if (error || !message) throw new HTTPException(404, { message: 'Outreach message not found' })
  return c.json(message)
})

// PATCH /outreach/:matchId — save employer edits (final_text ≤ 400 chars)
outreachRouter.patch('/:matchId', async (c) => {
  await getEmployerContext(c)
  const matchId = c.req.param('matchId')

  const body = await c.req.json()
  const schema = z.object({ final_text: z.string().trim().min(1).max(400) })
  const parsed = schema.safeParse(body)
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400)

  const { data: existing, error: fetchError } = await db
    .from('outreach_message')
    .select('id, delivery_status')
    .eq('match_id', matchId)
    .single()

  if (fetchError || !existing) throw new HTTPException(404, { message: 'Outreach message not found' })
  if (existing.delivery_status === 'sent') {
    return c.json({ error: 'Cannot edit a message that has already been sent' }, 400)
  }

  const { data: updated, error } = await db
    .from('outreach_message')
    .update({
      final_text: parsed.data.final_text,
      employer_edited: true,
      character_count: parsed.data.final_text.length,
    })
    .eq('id', existing.id)
    .select()
    .single()

  if (error) throw new HTTPException(500, { message: error.message })
  return c.json(updated)
})

// POST /outreach/:matchId/send — mark as sent
outreachRouter.post('/:matchId/send', async (c) => {
  const { employerUser } = await getEmployerContext(c)
  const matchId = c.req.param('matchId')

  const { data: message, error: fetchError } = await db
    .from('outreach_message')
    .select('id, draft_text, final_text, delivery_status')
    .eq('match_id', matchId)
    .single()

  if (fetchError || !message) throw new HTTPException(404, { message: 'Outreach message not found' })
  if (message.delivery_status === 'sent') {
    return c.json({ error: 'Message already sent' }, 400)
  }

  const textToSend = message.final_text ?? message.draft_text
  if (textToSend.length > 400) {
    return c.json({ error: 'Message exceeds 400 characters — edit it before sending' }, 400)
  }

  const { data: sent, error } = await db
    .from('outreach_message')
    .update({
      delivery_status: 'sent' as never,
      sent_at: new Date().toISOString(),
      character_count: textToSend.length,
    })
    .eq('id', message.id)
    .select()
    .single()

  if (error) throw new HTTPException(500, { message: error.message })

  await logEvent({
    actor_type: 'employer',
    actor_id: employerUser.employer_id,
    event_type: 'message_sent',
    related_entity_type: 'outreach_message',
    related_entity_id: message.id,
    payload: { match_id: matchId },
  })

  return c.json(sent)
})

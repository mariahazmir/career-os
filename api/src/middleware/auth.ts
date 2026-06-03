import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { db } from '../db/client.js'

export async function getAuthUser(c: Context) {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  if (!token) throw new HTTPException(401, { message: 'Unauthorized' })

  const { data: { user }, error } = await db.auth.getUser(token)
  if (error || !user) throw new HTTPException(401, { message: 'Unauthorized' })
  return user
}

export async function getCandidateContext(c: Context) {
  const user = await getAuthUser(c)

  const { data: existing } = await db
    .from('candidate')
    .select('id, name, email')
    .eq('email', user.email!)
    .single()

  if (existing) return { user, candidate: existing }

  // Auto-create candidate row from auth metadata on first call
  const name = (user.user_metadata?.name as string | undefined) ?? user.email ?? 'Unknown'
  const { data: created, error } = await db
    .from('candidate')
    .insert({ email: user.email!, name })
    .select()
    .single()

  if (error || !created) throw new HTTPException(500, { message: 'Failed to create candidate record' })
  return { user, candidate: created }
}

export async function getEmployerContext(c: Context) {
  const user = await getAuthUser(c)

  const { data: employerUser, error } = await db
    .from('employer_user')
    .select('id, employer_id, name, role')
    .eq('email', user.email!)
    .single()

  if (error || !employerUser) {
    throw new HTTPException(403, { message: 'Not an employer account' })
  }

  return { user, employerUser }
}

export async function logEvent(params: {
  actor_type: 'candidate' | 'employer'
  actor_id: string
  event_type: string
  related_entity_type?: string
  related_entity_id?: string
  payload?: Record<string, unknown>
}) {
  await db.from('interaction_event').insert({
    actor_type: params.actor_type,
    actor_id: params.actor_id,
    event_type: params.event_type as never,
    related_entity_type: params.related_entity_type ?? null,
    related_entity_id: params.related_entity_id ?? null,
    payload: params.payload ?? null,
  })
}

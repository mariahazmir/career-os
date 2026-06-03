import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { db } from '../db/client.js'
import { extractRoleCapability } from '../ai/capability.js'
import { getEmployerContext, logEvent } from '../middleware/auth.js'

export const roleRouter = new Hono()

const CreateRoleSchema = z.object({
  title: z.string().min(1),
  description_raw: z.string().min(10),
  context_notes: z.string().optional(),
  seniority_level: z.enum(['junior', 'mid', 'senior', 'lead', 'executive']).optional(),
  location_type: z.enum(['remote', 'hybrid', 'onsite']).optional(),
})

const UpdateCapabilityMapSchema = z.object({
  dimensions: z.array(z.object({
    tier: z.number().int().min(1).max(4),
    name: z.string(),
    required_score: z.number().min(0).max(1),
    weight: z.number().positive(),
    must_have: z.boolean(),
  })),
  edit_notes: z.string().optional(),
})

// List all roles for the authenticated employer
roleRouter.get('/', async (c) => {
  const { employerUser } = await getEmployerContext(c)

  const { data: roles, error } = await db
    .from('role')
    .select('*, role_capability_map(id, employer_edited, created_at)')
    .eq('employer_id', employerUser.employer_id)
    .order('created_at', { ascending: false })

  if (error) throw new HTTPException(500, { message: error.message })
  return c.json(roles)
})

// Create a new role
roleRouter.post('/', async (c) => {
  const { employerUser } = await getEmployerContext(c)

  const body = await c.req.json()
  const parsed = CreateRoleSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400)

  const { data: role, error } = await db
    .from('role')
    .insert({
      employer_id: employerUser.employer_id,
      created_by: employerUser.id,
      title: parsed.data.title,
      description_raw: parsed.data.description_raw,
      context_notes: parsed.data.context_notes ?? null,
      seniority_level: (parsed.data.seniority_level as never) ?? null,
      location_type: (parsed.data.location_type as never) ?? null,
      status: 'draft' as never,
    })
    .select()
    .single()

  if (error) throw new HTTPException(500, { message: error.message })
  return c.json(role, 201)
})

// Get a role with its capability map
roleRouter.get('/:id', async (c) => {
  const { employerUser } = await getEmployerContext(c)
  const id = c.req.param('id')

  const { data: role, error } = await db
    .from('role')
    .select('*, role_capability_map(*)')
    .eq('id', id)
    .eq('employer_id', employerUser.employer_id)
    .single()

  if (error || !role) throw new HTTPException(404, { message: 'Role not found' })
  return c.json(role)
})

// Trigger AI capability extraction
roleRouter.post('/:id/capability-map', async (c) => {
  const { employerUser } = await getEmployerContext(c)
  const id = c.req.param('id')

  const { data: role, error: roleError } = await db
    .from('role')
    .select('*')
    .eq('id', id)
    .eq('employer_id', employerUser.employer_id)
    .single()

  if (roleError || !role) throw new HTTPException(404, { message: 'Role not found' })

  const dimensions = await extractRoleCapability(role.description_raw, role.context_notes)

  const { data: map, error: mapError } = await db
    .from('role_capability_map')
    .insert({
      role_id: id,
      model_version: 'gemini-2.5-pro',
      dimensions: dimensions as never,
      employer_edited: false,
    })
    .select()
    .single()

  if (mapError) throw new HTTPException(500, { message: mapError.message })

  await db.from('role').update({ status: 'active' as never }).eq('id', id)

  await logEvent({
    actor_type: 'employer',
    actor_id: employerUser.employer_id,
    event_type: 'role_posted',
    related_entity_type: 'role',
    related_entity_id: id,
    payload: { map_id: map.id },
  })

  return c.json(map, 201)
})

// Update capability map dimensions (employer edits)
roleRouter.patch('/:id/capability-map', async (c) => {
  const { employerUser } = await getEmployerContext(c)
  const id = c.req.param('id')

  const body = await c.req.json()
  const parsed = UpdateCapabilityMapSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400)

  const { data: existing, error: fetchError } = await db
    .from('role_capability_map')
    .select('id')
    .eq('role_id', id)
    .single()

  if (fetchError || !existing) throw new HTTPException(404, { message: 'Capability map not found' })

  const { data: updated, error } = await db
    .from('role_capability_map')
    .update({
      dimensions: parsed.data.dimensions as never,
      employer_edited: true,
      edit_notes: parsed.data.edit_notes ?? null,
    })
    .eq('id', existing.id)
    .select()
    .single()

  if (error) throw new HTTPException(500, { message: error.message })
  return c.json(updated)
})

// Update role status
roleRouter.patch('/:id/status', async (c) => {
  const { employerUser } = await getEmployerContext(c)
  const id = c.req.param('id')

  const { status } = await c.req.json() as { status: string }
  if (!status) return c.json({ error: 'status required' }, 400)

  const { data, error } = await db
    .from('role')
    .update({ status: status as never, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('employer_id', employerUser.employer_id)
    .select()
    .single()

  if (error) throw new HTTPException(500, { message: error.message })
  return c.json(data)
})

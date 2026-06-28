import { Router, Request, Response } from 'express'
import { pool } from '../db/pool'

const router = Router()

// GET /api/users — all users
router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY name')
    res.json(result.rows)
  } catch (err) {
    console.error('GET /api/users error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/users/stats — all users with per-list card counts
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const usersResult = await pool.query('SELECT * FROM users ORDER BY name')
    const users = usersResult.rows

    const statsResult = await pool.query(`
      SELECT
        u.id AS user_id,
        l.name AS list_name,
        COUNT(c.id)::int AS count
      FROM users u
      LEFT JOIN card_assignees ca ON ca.user_id = u.id
      LEFT JOIN cards c ON ca.card_id = c.id AND c.archived = FALSE
      LEFT JOIN lists l ON c.list_id = l.id
      GROUP BY u.id, l.name
      ORDER BY u.id, l.name
    `)

    const byUser: Record<number, Record<string, number>> = {}
    for (const row of statsResult.rows) {
      if (!byUser[row.user_id]) byUser[row.user_id] = {}
      if (row.list_name) byUser[row.user_id][row.list_name] = row.count
    }

    const result = users.map((u: { id: number }) => ({
      ...u,
      column_counts: byUser[u.id] ?? {},
      total: Object.values(byUser[u.id] ?? {}).reduce((a: number, b: number) => a + b, 0),
    }))

    res.json(result)
  } catch (err) {
    console.error('GET /api/users/stats error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/users/:id/cards — all active cards assigned to a user
router.get('/:id/cards', async (req: Request, res: Response) => {
  const userId = parseInt(req.params['id'] as string, 10)
  try {
    const result = await pool.query(`
      SELECT
        c.id, c.title, c.job_number, c.project_address,
        c.priority, c.due_date, c.position,
        l.id AS list_id, l.name AS list_name, l.position AS list_position,
        p.id AS project_id, p.name AS project_name
      FROM card_assignees ca
      JOIN cards c ON ca.card_id = c.id
      JOIN lists l ON c.list_id = l.id
      JOIN projects p ON l.project_id = p.id
      WHERE ca.user_id = $1
        AND c.archived = FALSE
      ORDER BY p.name, l.position, c.position
    `, [userId])

    res.json(result.rows)
  } catch (err) {
    console.error('GET /api/users/:id/cards error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/users — create user
router.post('/', async (req, res) => {
  const { name, email, avatar } = req.body
  if (!name || !email || !avatar) { res.status(400).json({ error: 'name, email and avatar are required' }); return }
  try {
    const result = await pool.query(
      'INSERT INTO users (name, email, avatar) VALUES ($1, $2, $3) RETURNING *',
      [name, email, avatar]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error('POST /api/users error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PUT /api/users/:id — update user
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params['id'] as string, 10)
  const { name, email, avatar } = req.body
  try {
    const result = await pool.query(
      'UPDATE users SET name = COALESCE($1, name), email = COALESCE($2, email), avatar = COALESCE($3, avatar) WHERE id = $4 RETURNING *',
      [name, email, avatar, id]
    )
    if (result.rows.length === 0) { res.status(404).json({ error: 'User not found' }); return }
    res.json(result.rows[0])
  } catch (err) {
    console.error('PUT /api/users/:id error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /api/users/:id — delete user
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params['id'] as string, 10)
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [id])
    res.status(204).end()
  } catch (err) {
    console.error('DELETE /api/users/:id error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

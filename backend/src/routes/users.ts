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

export default router

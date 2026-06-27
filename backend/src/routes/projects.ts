import { Router, Request, Response } from 'express'
import { pool } from '../db/pool'

const router = Router()

// GET /api/projects
router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM projects ORDER BY created_at DESC'
    )
    res.json(result.rows)
  } catch (err) {
    console.error('GET /api/projects error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/projects
router.post('/', async (req: Request, res: Response) => {
  const { name, description } = req.body as { name: string; description?: string }
  if (!name) {
    res.status(400).json({ error: 'name is required' })
    return
  }
  try {
    const result = await pool.query(
      'INSERT INTO projects (name, description) VALUES ($1, $2) RETURNING *',
      [name, description ?? null]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error('POST /api/projects error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PUT /api/projects/:id
router.put('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params['id'] as string, 10)
  const { name, description, status } = req.body as {
    name?: string
    description?: string
    status?: string
  }
  try {
    const result = await pool.query(
      `UPDATE projects
       SET name        = COALESCE($1, name),
           description = COALESCE($2, description),
           status      = COALESCE($3, status)
       WHERE id = $4
       RETURNING *`,
      [name ?? null, description ?? null, status ?? null, id]
    )
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Project not found' })
      return
    }
    res.json(result.rows[0])
  } catch (err) {
    console.error('PUT /api/projects/:id error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /api/projects/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params['id'] as string, 10)
  try {
    const result = await pool.query(
      'DELETE FROM projects WHERE id = $1 RETURNING id',
      [id]
    )
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Project not found' })
      return
    }
    res.json({ deleted: true, id })
  } catch (err) {
    console.error('DELETE /api/projects/:id error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/projects/:id/board
router.get('/:id/board', async (req: Request, res: Response) => {
  const id = parseInt(req.params['id'] as string, 10)
  try {
    // Fetch the project
    const projectResult = await pool.query(
      'SELECT * FROM projects WHERE id = $1',
      [id]
    )
    if (projectResult.rowCount === 0) {
      res.status(404).json({ error: 'Project not found' })
      return
    }
    const project = projectResult.rows[0]

    // Fetch lists ordered by position
    const listsResult = await pool.query(
      'SELECT * FROM lists WHERE project_id = $1 ORDER BY position',
      [id]
    )
    const lists = listsResult.rows

    // For each list, fetch cards with tags and assignees
    const listsWithCards = await Promise.all(
      lists.map(async (list) => {
        const cardsResult = await pool.query(
          `SELECT c.*,
            COALESCE(
              json_agg(DISTINCT jsonb_build_object('id', t.id, 'name', t.name, 'color', t.color))
              FILTER (WHERE t.id IS NOT NULL), '[]'
            ) as tags,
            COALESCE(
              json_agg(DISTINCT jsonb_build_object('id', u.id, 'name', u.name, 'email', u.email, 'avatar', u.avatar))
              FILTER (WHERE u.id IS NOT NULL), '[]'
            ) as assignees
          FROM cards c
          LEFT JOIN card_tags ct ON c.id = ct.card_id
          LEFT JOIN tags t ON ct.tag_id = t.id
          LEFT JOIN card_assignees ca ON c.id = ca.card_id
          LEFT JOIN users u ON ca.user_id = u.id
          WHERE c.list_id = $1 AND c.archived = FALSE
          GROUP BY c.id
          ORDER BY c.position`,
          [list.id]
        )
        return {
          ...list,
          cards: cardsResult.rows,
        }
      })
    )

    res.json({ project, lists: listsWithCards })
  } catch (err) {
    console.error('GET /api/projects/:id/board error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

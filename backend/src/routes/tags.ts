import { Router, Request, Response } from 'express'
import { pool } from '../db/pool'

const router = Router()

// GET /api/tags
router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM tags ORDER BY name')
    res.json(result.rows)
  } catch (err) {
    console.error('GET /api/tags error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/tags
router.post('/', async (req: Request, res: Response) => {
  const { name, color } = req.body as { name: string; color: string }
  if (!name || !color) { res.status(400).json({ error: 'name and color are required' }); return }
  try {
    const result = await pool.query(
      'INSERT INTO tags (name, color) VALUES ($1, $2) RETURNING *',
      [name, color]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error('POST /api/tags error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PUT /api/tags/:id
router.put('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params['id'] as string, 10)
  const { name, color } = req.body as { name?: string; color?: string }
  try {
    const result = await pool.query(
      'UPDATE tags SET name = COALESCE($1, name), color = COALESCE($2, color) WHERE id = $3 RETURNING *',
      [name, color, id]
    )
    if (result.rows.length === 0) { res.status(404).json({ error: 'Tag not found' }); return }
    res.json(result.rows[0])
  } catch (err) {
    console.error('PUT /api/tags/:id error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /api/tags/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params['id'] as string, 10)
  try {
    await pool.query('DELETE FROM tags WHERE id = $1', [id])
    res.status(204).end()
  } catch (err) {
    console.error('DELETE /api/tags/:id error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

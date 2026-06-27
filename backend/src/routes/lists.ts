import { Router, Request, Response } from 'express'
import { pool } from '../db/pool'

const router = Router()

// POST /api/lists — create a new list in a project
router.post('/', async (req: Request, res: Response) => {
  const { project_id, name } = req.body as { project_id: number; name: string }
  if (!project_id || !name) {
    res.status(400).json({ error: 'project_id and name are required' })
    return
  }
  try {
    const posResult = await pool.query(
      'SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM lists WHERE project_id = $1',
      [project_id]
    )
    const position = posResult.rows[0].next_pos as number
    const result = await pool.query(
      'INSERT INTO lists (project_id, name, position) VALUES ($1, $2, $3) RETURNING *',
      [project_id, name.trim(), position]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error('POST /api/lists error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PUT /api/lists/:id — rename a list
router.put('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params['id'] as string, 10)
  const { name } = req.body as { name: string }
  if (!name) {
    res.status(400).json({ error: 'name is required' })
    return
  }
  try {
    const result = await pool.query(
      'UPDATE lists SET name = $1 WHERE id = $2 RETURNING *',
      [name.trim(), id]
    )
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'List not found' })
      return
    }
    res.json(result.rows[0])
  } catch (err) {
    console.error('PUT /api/lists/:id error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /api/lists/:id — delete a list and all its cards
router.delete('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params['id'] as string, 10)
  try {
    const result = await pool.query(
      'DELETE FROM lists WHERE id = $1 RETURNING id',
      [id]
    )
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'List not found' })
      return
    }
    res.json({ deleted: true, id })
  } catch (err) {
    console.error('DELETE /api/lists/:id error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

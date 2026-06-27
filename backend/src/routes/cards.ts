import { Router, Request, Response } from 'express'
import { pool } from '../db/pool'

const router = Router()

// POST /api/cards
router.post('/', async (req: Request, res: Response) => {
  const { list_id, title, priority, due_date, description, job_number, project_address } = req.body as {
    list_id: number
    title: string
    priority?: string
    due_date?: string
    description?: string
    job_number?: string
    project_address?: string
  }
  if (!list_id || !title) {
    res.status(400).json({ error: 'list_id and title are required' })
    return
  }
  try {
    // Determine next position in the list
    const posResult = await pool.query(
      'SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM cards WHERE list_id = $1',
      [list_id]
    )
    const position = posResult.rows[0].next_pos as number

    const result = await pool.query(
      `INSERT INTO cards (list_id, title, description, job_number, project_address, priority, due_date, position)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        list_id,
        title,
        description ?? null,
        job_number ?? null,
        project_address ?? null,
        priority ?? 'medium',
        due_date ?? null,
        position,
      ]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error('POST /api/cards error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PUT /api/cards/:id
router.put('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params['id'] as string, 10)
  const { title, description, priority, due_date, job_number, project_address, archived } = req.body as {
    title?: string
    description?: string
    priority?: string
    due_date?: string | null
    job_number?: string | null
    project_address?: string | null
    archived?: boolean
  }
  try {
    const result = await pool.query(
      `UPDATE cards
       SET title           = COALESCE($1, title),
           description     = COALESCE($2, description),
           priority        = COALESCE($3, priority),
           due_date        = CASE WHEN $4::text IS NOT NULL THEN $4::date ELSE due_date END,
           job_number      = COALESCE($5, job_number),
           project_address = COALESCE($6, project_address),
           archived        = CASE WHEN $7::boolean IS NOT NULL THEN $7 ELSE archived END,
           updated_at      = NOW()
       WHERE id = $8
       RETURNING *`,
      [title ?? null, description ?? null, priority ?? null, due_date ?? null, job_number ?? null, project_address ?? null, archived ?? null, id]
    )
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Card not found' })
      return
    }
    res.json(result.rows[0])
  } catch (err) {
    console.error('PUT /api/cards/:id error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /api/cards/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params['id'] as string, 10)
  try {
    const result = await pool.query(
      'DELETE FROM cards WHERE id = $1 RETURNING id',
      [id]
    )
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Card not found' })
      return
    }
    res.json({ deleted: true, id })
  } catch (err) {
    console.error('DELETE /api/cards/:id error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PATCH /api/cards/:id/move
router.patch('/:id/move', async (req: Request, res: Response) => {
  const id = parseInt(req.params['id'] as string, 10)
  const { list_id, position } = req.body as { list_id: number; position: number }

  if (list_id === undefined || position === undefined) {
    res.status(400).json({ error: 'list_id and position are required' })
    return
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Get the card's current list
    const cardResult = await client.query(
      'SELECT list_id FROM cards WHERE id = $1 FOR UPDATE',
      [id]
    )
    if (cardResult.rowCount === 0) {
      await client.query('ROLLBACK')
      res.status(404).json({ error: 'Card not found' })
      return
    }
    const oldListId: number = cardResult.rows[0].list_id

    // Move the card
    await client.query(
      'UPDATE cards SET list_id = $1, position = $2, updated_at = NOW() WHERE id = $3',
      [list_id, position, id]
    )

    // Reorder old list (skip the moved card)
    const oldListCards = await client.query(
      'SELECT id FROM cards WHERE list_id = $1 AND id != $2 ORDER BY position',
      [oldListId, id]
    )
    for (let i = 0; i < oldListCards.rows.length; i++) {
      await client.query('UPDATE cards SET position = $1 WHERE id = $2', [
        i,
        oldListCards.rows[i].id,
      ])
    }

    // Reorder new list (insert card at target position)
    const newListCards = await client.query(
      'SELECT id FROM cards WHERE list_id = $1 AND id != $2 ORDER BY position',
      [list_id, id]
    )
    // Build ordered array with the moved card inserted at the target position
    const newOrder: number[] = newListCards.rows.map(
      (r: { id: number }) => r.id
    )
    const clampedPos = Math.max(0, Math.min(position, newOrder.length))
    newOrder.splice(clampedPos, 0, id)

    for (let i = 0; i < newOrder.length; i++) {
      await client.query('UPDATE cards SET position = $1 WHERE id = $2', [
        i,
        newOrder[i],
      ])
    }

    await client.query('COMMIT')

    const updatedCard = await pool.query(
      'SELECT * FROM cards WHERE id = $1',
      [id]
    )
    res.json(updatedCard.rows[0])
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('PATCH /api/cards/:id/move error:', err)
    res.status(500).json({ error: 'Internal server error' })
  } finally {
    client.release()
  }
})

// POST /api/cards/:id/tags
router.post('/:id/tags', async (req: Request, res: Response) => {
  const cardId = parseInt(req.params['id'] as string, 10)
  const { tag_id } = req.body as { tag_id: number }
  if (!tag_id) {
    res.status(400).json({ error: 'tag_id is required' })
    return
  }
  try {
    const result = await pool.query(
      'INSERT INTO card_tags (card_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *',
      [cardId, tag_id]
    )
    res.status(201).json(result.rows[0] ?? { card_id: cardId, tag_id })
  } catch (err) {
    console.error('POST /api/cards/:id/tags error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /api/cards/:id/tags/:tagId
router.delete('/:id/tags/:tagId', async (req: Request, res: Response) => {
  const cardId = parseInt(req.params['id'] as string, 10)
  const tagId = parseInt(req.params['tagId'] as string, 10)
  try {
    await pool.query(
      'DELETE FROM card_tags WHERE card_id = $1 AND tag_id = $2',
      [cardId, tagId]
    )
    res.json({ deleted: true, card_id: cardId, tag_id: tagId })
  } catch (err) {
    console.error('DELETE /api/cards/:id/tags/:tagId error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/cards/:id/assignees
router.post('/:id/assignees', async (req: Request, res: Response) => {
  const cardId = parseInt(req.params['id'] as string, 10)
  const { user_id } = req.body as { user_id: number }
  if (!user_id) {
    res.status(400).json({ error: 'user_id is required' })
    return
  }
  try {
    const result = await pool.query(
      'INSERT INTO card_assignees (card_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *',
      [cardId, user_id]
    )
    res.status(201).json(result.rows[0] ?? { card_id: cardId, user_id })
  } catch (err) {
    console.error('POST /api/cards/:id/assignees error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /api/cards/:id/assignees/:userId
router.delete('/:id/assignees/:userId', async (req: Request, res: Response) => {
  const cardId = parseInt(req.params['id'] as string, 10)
  const userId = parseInt(req.params['userId'] as string, 10)
  try {
    await pool.query(
      'DELETE FROM card_assignees WHERE card_id = $1 AND user_id = $2',
      [cardId, userId]
    )
    res.json({ deleted: true, card_id: cardId, user_id: userId })
  } catch (err) {
    console.error('DELETE /api/cards/:id/assignees/:userId error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

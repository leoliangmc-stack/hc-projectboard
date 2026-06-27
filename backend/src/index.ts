import express, { Request, Response } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { pool } from './db/pool'
import projectsRouter from './routes/projects'
import cardsRouter from './routes/cards'
import listsRouter from './routes/lists'
import usersRouter from './routes/users'

dotenv.config()

async function initDB() {
  const schemaPath = path.join(__dirname, 'db', 'schema.sql')
  const schema = fs.readFileSync(schemaPath, 'utf8')
  const maxRetries = 10
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
  for (let i = 0; i < maxRetries; i++) {
    try {
      await pool.query(schema)
      console.log('Database schema initialized')
      return
    } catch (err) {
      if (i < maxRetries - 1) {
        console.log(`DB init attempt ${i + 1} failed, retrying in 3s...`)
        await delay(3000)
      } else {
        throw err
      }
    }
  }
}

const app = express()
const PORT = parseInt(process.env.PORT ?? '3001', 10)

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = (process.env.FRONTEND_URL ?? 'http://localhost:3000').split(',').map(s => s.trim())
      if (!origin || allowed.includes(origin) || origin.endsWith('.vercel.app')) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true,
  })
)
app.use(express.json())

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Routes
app.use('/api/projects', projectsRouter)
app.use('/api/cards', cardsRouter)
app.use('/api/lists', listsRouter)
app.use('/api/users', usersRouter)

// GET /api/tags
app.get('/api/tags', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM tags ORDER BY name')
    res.json(result.rows)
  } catch (err) {
    console.error('GET /api/tags error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Start server immediately so health checks pass, then init DB in background
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  initDB().catch((err) => {
    console.error('Failed to initialize database, exiting:', err)
    process.exit(1)
  })
})

export default app

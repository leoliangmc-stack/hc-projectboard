import { Pool } from 'pg'
import dotenv from 'dotenv'
dotenv.config()

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/hc_projectboard',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

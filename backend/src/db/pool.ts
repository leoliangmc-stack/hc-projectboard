import { Pool } from 'pg'
import dotenv from 'dotenv'
dotenv.config()

const useSSL = process.env.DATABASE_SSL !== 'false' && process.env.NODE_ENV === 'production'

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/hc_projectboard',
  ssl: useSSL ? { rejectUnauthorized: false } : false,
})

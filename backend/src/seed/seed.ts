import * as fs from 'fs'
import * as path from 'path'
import { pool } from '../db/pool'

async function seed() {
  const client = await pool.connect()
  try {
    console.log('Connected to database.')

    // 1. Run schema DDL
    const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql')
    const schemaSql = fs.readFileSync(schemaPath, 'utf8')
    console.log('Running schema DDL...')
    await client.query(schemaSql)
    console.log('Schema applied.')

    // 2. Clear existing data
    console.log('Clearing existing data...')
    await client.query('DELETE FROM card_assignees')
    await client.query('DELETE FROM card_tags')
    await client.query('DELETE FROM cards')
    await client.query('DELETE FROM lists')
    await client.query('DELETE FROM projects')
    await client.query('DELETE FROM tags')
    await client.query('DELETE FROM users')
    await client.query("SELECT setval('users_id_seq', 1, false)")
    await client.query("SELECT setval('projects_id_seq', 1, false)")
    await client.query("SELECT setval('lists_id_seq', 1, false)")
    await client.query("SELECT setval('cards_id_seq', 1, false)")
    await client.query("SELECT setval('tags_id_seq', 1, false)")
    await client.query("SELECT setval('card_tags_id_seq', 1, false)")
    await client.query("SELECT setval('card_assignees_id_seq', 1, false)")
    console.log('Data cleared.')

    // 3. Insert users
    console.log('Inserting users...')
    const usersResult = await client.query(`
      INSERT INTO users (name, email, avatar) VALUES
        ('Leo Liang',   'leo@hcstructural.com.au',   'L'),
        ('John Morris', 'john@hcstructural.com.au',  'J'),
        ('Mike Chen',   'mike@hcstructural.com.au',  'M'),
        ('Sarah Wong',  'sarah@hcstructural.com.au', 'S')
      RETURNING id, name
    `)
    const users: Record<string, number> = {}
    for (const row of usersResult.rows) {
      users[row.name] = row.id
    }

    // 4. Insert tags
    console.log('Inserting tags...')
    const tagsResult = await client.query(`
      INSERT INTO tags (name, color) VALUES
        ('Residential',  '#3b82f6'),
        ('Commercial',   '#f97316'),
        ('Industrial',   '#8b5cf6'),
        ('Heritage',     '#eab308'),
        ('Civil',        '#22c55e'),
        ('Urgent',       '#ef4444')
      RETURNING id, name
    `)
    const tags: Record<string, number> = {}
    for (const row of tagsResult.rows) {
      tags[row.name] = row.id
    }

    // 5. Insert 3 boards
    console.log('Inserting boards...')
    const projectsResult = await client.query(`
      INSERT INTO projects (name, description) VALUES
        ('Structure', 'Structural engineering projects'),
        ('Civil',     'Civil and infrastructure projects'),
        ('Geotech',   'Geotechnical engineering projects')
      RETURNING id, name
    `)
    const projects: Record<string, number> = {}
    for (const row of projectsResult.rows) {
      projects[row.name] = row.id
    }

    // Helper: insert 4 default lists for a board
    async function insertLists(projectId: number): Promise<Record<string, number>> {
      const result = await client.query(
        `INSERT INTO lists (project_id, name, position) VALUES
          ($1, 'Waiting Arch', 0),
          ($1, 'Design',       1),
          ($1, 'Drawing',      2),
          ($1, 'Review',       3)
        RETURNING id, name`,
        [projectId]
      )
      const map: Record<string, number> = {}
      for (const row of result.rows) map[row.name] = row.id
      return map
    }

    // Helper: insert a card
    async function insertCard(
      listId: number,
      title: string,
      jobNumber: string,
      address: string,
      priority: string,
      position: number,
      dueDate?: string,
      description?: string
    ): Promise<number> {
      const result = await client.query(
        `INSERT INTO cards (list_id, title, job_number, project_address, description, priority, due_date, position)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [listId, title, jobNumber, address, description ?? null, priority, dueDate ?? null, position]
      )
      return result.rows[0].id as number
    }

    async function tag(cardId: number, tagName: string) {
      await client.query(
        'INSERT INTO card_tags (card_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [cardId, tags[tagName]]
      )
    }

    async function assign(cardId: number, userName: string) {
      await client.query(
        'INSERT INTO card_assignees (card_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [cardId, users[userName]]
      )
    }

    // 6. Create lists for all 3 boards
    console.log('Inserting lists...')
    const strLists = await insertLists(projects['Structure'])
    const civLists = await insertLists(projects['Civil'])
    const geoLists = await insertLists(projects['Geotech'])

    // 7. Structure board cards
    console.log('Inserting Structure cards...')
    const s1 = await insertCard(strLists['Waiting Arch'], 'Double Storey Extension', 'HC-2024-0112', '47 Maple Street, Doncaster VIC 3108', 'high', 0, '2026-07-15', 'Structural design for rear extension and new upper floor')
    await assign(s1, 'Leo Liang'); await assign(s1, 'Mike Chen')
    await tag(s1, 'Residential')

    const s2 = await insertCard(strLists['Design'], 'Mixed-Use Tower - 12 Levels', 'HC-2024-0203', '450 Collins Street, Melbourne VIC 3000', 'urgent', 0, '2026-07-30', 'Structural frame design for retail podium + office floors')
    await assign(s2, 'Leo Liang'); await assign(s2, 'John Morris')
    await tag(s2, 'Commercial'); await tag(s2, 'Urgent')

    const s3 = await insertCard(strLists['Design'], 'Townhouse Development x4', 'HC-2024-0118', '92 Park Road, Hawthorn VIC 3122', 'high', 1, '2026-07-08')
    await assign(s3, 'Leo Liang')
    await tag(s3, 'Residential')

    const s4 = await insertCard(strLists['Drawing'], 'Basement Carpark - 3 Level', 'HC-2024-0098', '210 High Street, Prahran VIC 3181', 'high', 0, '2026-06-30')
    await assign(s4, 'Leo Liang'); await assign(s4, 'Sarah Wong')
    await tag(s4, 'Residential')

    const s5 = await insertCard(strLists['Review'], 'Mezzanine Floor - Warehouse', 'HC-2024-0187', '23 Trade Park Drive, Tullamarine VIC 3043', 'high', 0, '2026-06-28')
    await assign(s5, 'Mike Chen')
    await tag(s5, 'Commercial')

    // 8. Civil board cards
    console.log('Inserting Civil cards...')
    const c1 = await insertCard(civLists['Waiting Arch'], 'Retaining Wall - Hillside Estate', 'HC-2024-0309', '45 Summit Road, Eltham VIC 3095', 'medium', 0, '2026-09-20')
    await assign(c1, 'Mike Chen')
    await tag(c1, 'Civil')

    const c2 = await insertCard(civLists['Design'], 'Pedestrian Bridge - CBD', 'HC-2024-0301', 'Yarra River Crossing, South Yarra VIC 3141', 'high', 0, '2026-08-30')
    await assign(c2, 'Leo Liang'); await assign(c2, 'John Morris')
    await tag(c2, 'Civil')

    const c3 = await insertCard(civLists['Drawing'], 'Car Park Structure - 5 Level', 'HC-2024-0288', 'Station Street, Ringwood VIC 3134', 'urgent', 0, '2026-07-01')
    await assign(c3, 'Leo Liang'); await assign(c3, 'Sarah Wong')
    await tag(c3, 'Civil'); await tag(c3, 'Urgent')

    const c4 = await insertCard(civLists['Review'], 'Stormwater Culvert Upgrade', 'HC-2024-0261', 'Dandenong Creek Road, Bayswater VIC 3153', 'low', 0, '2026-08-10')
    await assign(c4, 'John Morris')
    await tag(c4, 'Civil')

    // 9. Geotech board cards
    console.log('Inserting Geotech cards...')
    const g1 = await insertCard(geoLists['Waiting Arch'], 'Victorian Terrace Underpinning', 'HC-2024-0401', '12 Hotham Street, East Melbourne VIC 3002', 'high', 0, '2026-07-25', 'Structural underpinning for basement excavation')
    await assign(g1, 'Sarah Wong')
    await tag(g1, 'Heritage')

    const g2 = await insertCard(geoLists['Design'], 'Former Wool Store Conversion', 'HC-2024-0408', '67 Tanner Street, Richmond VIC 3121', 'medium', 0, '2026-09-15')
    await assign(g2, 'John Morris')
    await tag(g2, 'Heritage')

    const g3 = await insertCard(geoLists['Drawing'], 'Church Facade Stabilisation', 'HC-2024-0389', '3 Church Street, Brighton VIC 3186', 'urgent', 0, '2026-06-25')
    await assign(g3, 'Leo Liang'); await assign(g3, 'Mike Chen')
    await tag(g3, 'Heritage'); await tag(g3, 'Urgent')

    const g4 = await insertCard(geoLists['Review'], 'Site Investigation Report', 'HC-2024-0415', '88 Industrial Drive, Dandenong VIC 3175', 'medium', 0, '2026-08-05')
    await assign(g4, 'Sarah Wong')
    await tag(g4, 'Industrial')

    console.log('\n✓ Seed complete! 3 boards ready: Structure, Civil, Geotech.')
  } catch (err) {
    console.error('Seed error:', err)
    throw err
  } finally {
    client.release()
    await pool.end()
    process.exit(0)
  }
}

seed()

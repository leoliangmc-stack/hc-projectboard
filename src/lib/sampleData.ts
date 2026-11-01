import { createCard, createId } from './board'
import { addDays, toIsoDate } from './dates'
import type { Board, Card, Column, Member, Priority, Tag } from './types'

/*
 * Demo data: a pipeline of civil infrastructure projects for a New Zealand contractor.
 * All projects, codes and people are fictional.
 */

interface SampleCard {
  code: string
  title: string
  location: string
  description?: string
  priority: Priority
  /** Due date (next milestone) as an offset in days from the day the board is created. */
  dueInDays?: number
  tags?: string[]
  assignees?: string[]
}

const TAGS: Record<string, Omit<Tag, 'id'>> = {
  roads: { name: 'Roads & Bridges', color: '#f59e0b' },
  water: { name: 'Three Waters', color: '#3b82f6' },
  marine: { name: 'Marine', color: '#14b8a6' },
  earthworks: { name: 'Earthworks', color: '#f97316' },
  maintenance: { name: 'Maintenance', color: '#8b5cf6' },
  safety: { name: 'Health & Safety', color: '#ef4444' },
}

const MEMBERS: Record<string, Omit<Member, 'id'>> = {
  hemi: { name: 'Hemi Walker', initials: 'HW', color: '#10b981' },
  sophie: { name: 'Sophie Chen', initials: 'SC', color: '#3b82f6' },
  liam: { name: "Liam O'Connor", initials: 'LO', color: '#f97316' },
  priya: { name: 'Priya Nair', initials: 'PN', color: '#8b5cf6' },
}

const COLUMNS: { name: string; cards: SampleCard[] }[] = [
  {
    name: 'Tendering',
    cards: [
      {
        code: 'PRJ-215',
        title: 'Wharf extension and marine piling',
        location: 'Nelson',
        description: 'Tender for a 60 m wharf extension on steel tube piles with precast deck units.',
        priority: 'high',
        dueInDays: 9,
        tags: ['marine'],
        assignees: ['priya'],
      },
      {
        code: 'PRJ-218',
        title: 'Subdivision earthworks and services',
        location: 'Hamilton, Waikato',
        description: 'Bulk earthworks plus stormwater and wastewater reticulation for a 120-lot subdivision.',
        priority: 'medium',
        dueInDays: 21,
        tags: ['earthworks', 'water'],
        assignees: ['priya'],
      },
    ],
  },
  {
    name: 'Pre-construction',
    cards: [
      {
        code: 'PRJ-209',
        title: 'Rural bridge replacement',
        location: "Hawke's Bay",
        description:
          'Replace a single-lane timber bridge with a two-lane precast concrete bridge. Resource consent and traffic management plan needed before site establishment.',
        priority: 'high',
        dueInDays: 5,
        tags: ['roads'],
        assignees: ['hemi', 'sophie'],
      },
      {
        code: 'PRJ-211',
        title: 'Wastewater pump station upgrade',
        location: 'Christchurch, Canterbury',
        description: 'New pumps, rising main and controls, with temporary bypass pumping to keep the network running.',
        priority: 'medium',
        dueInDays: 14,
        tags: ['water'],
        assignees: ['liam'],
      },
    ],
  },
  {
    name: 'In Construction',
    cards: [
      {
        code: 'PRJ-201',
        title: 'State highway intersection upgrade',
        location: 'Tauranga, Bay of Plenty',
        description: 'Signalised intersection, kerb and channel, new pavement and lighting. Surfacing is done at night under traffic management.',
        priority: 'urgent',
        dueInDays: 2,
        tags: ['roads', 'safety'],
        assignees: ['hemi', 'sophie'],
      },
      {
        code: 'PRJ-204',
        title: 'Reservoir and trunk watermain',
        location: 'Invercargill, Southland',
        description: 'New 5 ML concrete reservoir and 2.4 km of trunk watermain.',
        priority: 'high',
        dueInDays: 10,
        tags: ['water'],
        assignees: ['liam'],
      },
      {
        code: 'PRJ-206',
        title: 'Slip repair and retaining wall',
        location: 'Gisborne, Tairāwhiti',
        description:
          'Soldier pile wall and drainage to reinstate a storm-damaged road. Critical risk: plant working near an unstable slope.',
        priority: 'urgent',
        dueInDays: -1,
        tags: ['earthworks', 'roads', 'safety'],
        assignees: ['sophie'],
      },
    ],
  },
  {
    name: 'Practical Completion',
    cards: [
      {
        code: 'PRJ-198',
        title: 'Road resurfacing programme',
        location: 'Auckland',
        description: 'Chip seal and asphalt resurfacing across 18 sites. Defects inspection and as-builts outstanding.',
        priority: 'high',
        dueInDays: 1,
        tags: ['maintenance', 'roads'],
        assignees: ['hemi'],
      },
    ],
  },
  {
    name: 'Closed Out',
    cards: [
      {
        code: 'PRJ-190',
        title: 'Stormwater culvert renewal',
        location: 'Lower Hutt, Wellington',
        priority: 'medium',
        tags: ['water'],
        assignees: ['liam', 'sophie'],
      },
      {
        code: 'PRJ-185',
        title: 'Cycleway and shared path',
        location: 'Christchurch, Canterbury',
        priority: 'low',
        tags: ['roads'],
        assignees: ['hemi'],
      },
    ],
  },
]

export function createSampleBoard(today: Date = new Date()): Board {
  const tagIds: Record<string, string> = {}
  const tags: Tag[] = Object.entries(TAGS).map(([key, tag]) => {
    tagIds[key] = createId()
    return { id: tagIds[key], ...tag }
  })

  const memberIds: Record<string, string> = {}
  const members: Member[] = Object.entries(MEMBERS).map(([key, member]) => {
    memberIds[key] = createId()
    return { id: memberIds[key], ...member }
  })

  const columns: Column[] = COLUMNS.map(column => ({
    id: createId(),
    name: column.name,
    cards: column.cards.map(
      (sample): Card =>
        createCard({
          code: sample.code,
          title: sample.title,
          location: sample.location,
          description: sample.description ?? '',
          priority: sample.priority,
          dueDate: sample.dueInDays === undefined ? null : toIsoDate(addDays(today, sample.dueInDays)),
          tagIds: (sample.tags ?? []).map(key => tagIds[key]),
          assigneeIds: (sample.assignees ?? []).map(key => memberIds[key]),
        }),
    ),
  }))

  return { version: 2, title: 'Project Pipeline', columns, tags, members }
}

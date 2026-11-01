import { createCard, createId } from './board'
import { addDays, toIsoDate } from './dates'
import type { Board, Card, Column, Member, Priority, Tag } from './types'

interface SampleCard {
  code: string
  title: string
  description?: string
  priority: Priority
  /** Due date as an offset in days from the day the board is created. */
  dueInDays?: number
  tags?: string[]
  assignees?: string[]
}

const TAGS: Record<string, Omit<Tag, 'id'>> = {
  design: { name: 'Design', color: '#8b5cf6' },
  frontend: { name: 'Frontend', color: '#3b82f6' },
  backend: { name: 'Backend', color: '#14b8a6' },
  research: { name: 'Research', color: '#f59e0b' },
  marketing: { name: 'Marketing', color: '#ec4899' },
  bug: { name: 'Bug', color: '#ef4444' },
}

const MEMBERS: Record<string, Omit<Member, 'id'>> = {
  alex: { name: 'Alex Kim', initials: 'AK', color: '#3b82f6' },
  jordan: { name: 'Jordan Lee', initials: 'JL', color: '#10b981' },
  sam: { name: 'Sam Patel', initials: 'SP', color: '#f97316' },
  taylor: { name: 'Taylor Brooks', initials: 'TB', color: '#8b5cf6' },
}

const COLUMNS: { name: string; cards: SampleCard[] }[] = [
  {
    name: 'Backlog',
    cards: [
      {
        code: 'PRJ-118',
        title: 'Customer feedback portal',
        description: 'Collect feature requests and let customers vote on them.',
        priority: 'low',
        dueInDays: 30,
        tags: ['research'],
        assignees: ['jordan'],
      },
      {
        code: 'PRJ-121',
        title: 'Dark mode for the mobile app',
        priority: 'medium',
        tags: ['design', 'frontend'],
      },
      {
        code: 'PRJ-124',
        title: 'Partner integrations marketplace',
        description: 'Scope a directory page for third-party integrations.',
        priority: 'low',
        dueInDays: 45,
        tags: ['research', 'marketing'],
      },
    ],
  },
  {
    name: 'To Do',
    cards: [
      {
        code: 'PRJ-109',
        title: 'Onboarding flow redesign',
        description: 'Reduce the sign-up flow from five steps to three and add a progress indicator.',
        priority: 'high',
        dueInDays: 6,
        tags: ['design'],
        assignees: ['taylor', 'alex'],
      },
      {
        code: 'PRJ-112',
        title: 'Billing page accessibility audit',
        priority: 'medium',
        dueInDays: 12,
        tags: ['frontend'],
        assignees: ['sam'],
      },
    ],
  },
  {
    name: 'In Progress',
    cards: [
      {
        code: 'PRJ-104',
        title: 'Marketing website relaunch',
        description: 'New landing pages, pricing page and blog templates.',
        priority: 'urgent',
        dueInDays: 2,
        tags: ['frontend', 'marketing'],
        assignees: ['alex', 'taylor'],
      },
      {
        code: 'PRJ-107',
        title: 'Analytics dashboard',
        description: 'Weekly active users, retention cohorts and revenue charts.',
        priority: 'high',
        dueInDays: 9,
        tags: ['frontend', 'backend'],
        assignees: ['jordan'],
      },
      {
        code: 'PRJ-111',
        title: 'Fix checkout timeout on slow networks',
        priority: 'urgent',
        dueInDays: -1,
        tags: ['bug', 'backend'],
        assignees: ['sam'],
      },
    ],
  },
  {
    name: 'Review',
    cards: [
      {
        code: 'PRJ-102',
        title: 'Design system v2',
        description: 'Tokens, typography scale and a shared component library.',
        priority: 'high',
        dueInDays: 1,
        tags: ['design', 'frontend'],
        assignees: ['taylor'],
      },
    ],
  },
  {
    name: 'Done',
    cards: [
      {
        code: 'PRJ-101',
        title: 'User interview synthesis',
        priority: 'medium',
        tags: ['research'],
        assignees: ['jordan', 'sam'],
      },
      {
        code: 'PRJ-103',
        title: 'Public API documentation',
        priority: 'low',
        tags: ['backend'],
        assignees: ['alex'],
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
          description: sample.description ?? '',
          priority: sample.priority,
          dueDate: sample.dueInDays === undefined ? null : toIsoDate(addDays(today, sample.dueInDays)),
          tagIds: (sample.tags ?? []).map(key => tagIds[key]),
          assigneeIds: (sample.assignees ?? []).map(key => memberIds[key]),
        }),
    ),
  }))

  return { version: 1, title: 'Product Roadmap', columns, tags, members }
}

export interface Project {
  id: number
  name: string
  description: string | null
  status: 'active' | 'archived' | 'completed'
  created_at: string
}

export interface Tag {
  id: number
  name: string
  color: string
}

export interface User {
  id: number
  name: string
  email: string
  avatar: string
}

export interface Card {
  id: number
  list_id: number
  title: string
  description: string | null
  job_number: string | null
  project_address: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date: string | null
  position: number
  created_at: string
  updated_at: string
  tags: Tag[]
  assignees: User[]
}

export interface List {
  id: number
  project_id: number
  name: string
  position: number
  cards: Card[]
}

export interface BoardData {
  project: Project
  lists: List[]
}

export interface UserStats extends User {
  total: number
  column_counts: Record<string, number>
}

export interface UserCard {
  id: number
  title: string
  job_number: string | null
  project_address: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date: string | null
  list_id: number
  list_name: string
  list_position: number
  project_id: number
  project_name: string
}

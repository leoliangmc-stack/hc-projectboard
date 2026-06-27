const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

export const api = {
  projects: {
    list: () => request<import('./types').Project[]>('/projects'),
    get: (id: number) => request<{ project: import('./types').Project; lists: import('./types').List[] }>(`/projects/${id}/board`),
    create: (data: { name: string; description?: string }) =>
      request<import('./types').Project>('/projects', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: number) => request<void>(`/projects/${id}`, { method: 'DELETE' }),
  },
  cards: {
    create: (data: { list_id: number; title: string; priority?: string; description?: string; job_number?: string; project_address?: string }) =>
      request<import('./types').Card>('/cards', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Partial<import('./types').Card>) =>
      request<import('./types').Card>(`/cards/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    move: (id: number, data: { list_id: number; position: number }) =>
      request<import('./types').Card>(`/cards/${id}/move`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: number) => request<void>(`/cards/${id}`, { method: 'DELETE' }),
    addTag: (cardId: number, tagId: number) =>
      request<void>(`/cards/${cardId}/tags`, { method: 'POST', body: JSON.stringify({ tag_id: tagId }) }),
    removeTag: (cardId: number, tagId: number) =>
      request<void>(`/cards/${cardId}/tags/${tagId}`, { method: 'DELETE' }),
    addAssignee: (cardId: number, userId: number) =>
      request<void>(`/cards/${cardId}/assignees`, { method: 'POST', body: JSON.stringify({ user_id: userId }) }),
    removeAssignee: (cardId: number, userId: number) =>
      request<void>(`/cards/${cardId}/assignees/${userId}`, { method: 'DELETE' }),
  },
  lists: {
    create: (data: { project_id: number; name: string }) =>
      request<import('./types').List>('/lists', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, name: string) =>
      request<import('./types').List>(`/lists/${id}`, { method: 'PUT', body: JSON.stringify({ name }) }),
    delete: (id: number) => request<void>(`/lists/${id}`, { method: 'DELETE' }),
  },
  tags: {
    list: () => request<import('./types').Tag[]>('/tags'),
  },
  users: {
    list: () => request<import('./types').User[]>('/users'),
    stats: () => request<import('./types').UserStats[]>('/users/stats'),
    cards: (id: number) => request<import('./types').UserCard[]>(`/users/${id}/cards`),
  },
}

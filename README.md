# hc ProjectBoard

A Trello-like project management board with multi-project support, drag-and-drop task management, and team collaboration.

## Tech Stack

- **Frontend**: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui + dnd-kit (drag and drop)
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL
- **Deployment**: Vercel (frontend + backend as multi-service in one repo)

## Features

- Project management: create, archive, complete status
- Drag-and-drop lists and cards on the board
- Card details: priority, due date, job number, project address, tags, assignees, archive
- Tag management
- Team and user management
- Activity log

## Project Structure

```
.
├── frontend/   # Next.js frontend
│   └── src/
│       ├── app/          # Routes (projects, team, activity)
│       ├── components/   # UI components (board, task, layout, ui)
│       └── lib/
├── backend/    # Express backend
│   └── src/
│       ├── routes/       # projects / lists / cards / tags / users
│       ├── db/           # DB connection and schema
│       └── seed/         # Seed data script
├── docs/
└── vercel.json # Multi-service deployment config (frontend + backend)
```

## Local Development

### Prerequisites

- Node.js 18+
- PostgreSQL

### Backend

```bash
cd backend
cp .env.example .env   # configure DATABASE_URL, PORT, etc.
npm install
npm run dev              # starts dev server (default port 3001)
npm run seed              # optional: load seed data
```

### Frontend

```bash
cd frontend
npm install
npm run dev               # starts dev server (default port 3000)
```

## Deployment

The project is configured in `vercel.json` as a multi-service deployment in a single repo: requests to `/api/backend/*` are routed to the backend service, everything else goes to the frontend service.

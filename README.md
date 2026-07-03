# hc ProjectBoard

一个类 Trello 的项目管理看板工具，支持多项目、拖拽式任务管理、团队协作。

## 技术栈

- **前端**：Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui + dnd-kit（拖拽）
- **后端**：Node.js + Express + TypeScript
- **数据库**：PostgreSQL
- **部署**：Vercel（前后端同仓库多服务部署）

## 功能

- 项目（Project）管理：创建、归档、完成状态
- 看板列表（List）与卡片（Card）的拖拽排序
- 卡片属性：优先级、截止日期、工单号、项目地址、标签、负责人、归档
- 标签（Tag）管理
- 团队与成员（User / Team）管理
- 活动记录（Activity）

## 目录结构

```
.
├── frontend/   # Next.js 前端
│   └── src/
│       ├── app/          # 页面路由（projects、team、activity）
│       ├── components/   # UI 组件（board、task、layout、ui）
│       └── lib/
├── backend/    # Express 后端
│   └── src/
│       ├── routes/       # projects / lists / cards / tags / users
│       ├── db/           # 数据库连接与 schema
│       └── seed/         # 种子数据脚本
├── docs/
└── vercel.json # 多服务部署配置（frontend + backend）
```

## 本地开发

### 环境要求

- Node.js 18+
- PostgreSQL

### 后端

```bash
cd backend
cp .env.example .env   # 配置 DATABASE_URL、PORT 等
npm install
npm run dev             # 启动开发服务器（默认 3001 端口）
npm run seed             # 可选：写入种子数据
```

### 前端

```bash
cd frontend
npm install
npm run dev              # 启动开发服务器（默认 3000 端口）
```

## 部署

项目通过 `vercel.json` 配置为前后端同仓库的多服务部署：`/api/backend/*` 请求转发到后端服务，其余请求转发到前端服务。

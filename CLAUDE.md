# 项目基本信息
- **名称**：ProjectBoard
- **技术栈**：Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4 + dnd-kit
- **说明**：纯前端作品集项目，无后端；看板数据保存在浏览器 localStorage
 
项目根目录：当前工作目录

# 目录结构
├── src/
│   ├── app/          # Next.js 入口（layout、page、全局样式）
│   ├── components/   # 看板组件（board）与 UI 组件（ui）
│   ├── hooks/        # useBoard（状态 + localStorage 持久化）
│   └── lib/          # 看板 reducer、类型、示例数据、工具函数
├── tests/            # Vitest 单元测试
└── docs/             # README 截图等资源

# 代码规范
1. JavaScript/TypeScript 强制使用 ES6+ 语法
2. 组件命名：PascalCase 风格
3. 变量命名：camelCase 风格
 
# 常用命令
- 启动开发服务器：`npm run dev`
- 运行测试：`npm test`
- 构建生产包：`npm run build`

@AGENTS.md

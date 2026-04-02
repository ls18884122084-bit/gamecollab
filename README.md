# GameColla

**游戏协作平台** - 基于 Git 的多人实时协作编辑系统

## ✨ 功能特性

- 🔐 用户认证系统（注册/登录）
- 📁 文件管理与版本控制（基于 Git）
- 👥 多人实时协作编辑
- 🔑 权限管理（Owner / Admin / Write / Read）
- 💬 实时在线状态显示
- 📝 代码编辑器（Monaco Editor）
- 🔄 文件历史与 Diff 对比

## 🏗️ 技术栈

### 后端
- **运行时**: Node.js 18+
- **框架**: Express.js
- **数据库**: PostgreSQL 16
- **缓存**: Redis 7
- **WebSocket**: Socket.IO
- **Git 操作**: simple-git

### 前端
- **框架**: React 18
- **构建工具**: Vite
- **路由**: React Router v6
- **状态管理**: Zustand
- **样式**: Tailwind CSS
- **编辑器**: Monaco Editor
- **图标**: Lucide React

## 📦 快速开始

### 前置要求

- Node.js >= 18
- PostgreSQL >= 14
- Redis >= 6
- Git

### 安装依赖

```bash
# 后端
cd backend
npm install
cp .env.example .env

# 前端
cd frontend
npm install
```

### 启动服务

```bash
# 后端（端口 3000）
cd backend && npm run dev

# 前端（端口 5173）
cd frontend && npm run dev
```

访问 http://localhost:5173

## 📁 项目结构

```
gamecolla/
├── backend/                 # 后端服务
├── frontend/                # 前端应用
├── shared/                  # 共享代码
├── docs/                    # 项目文档
├── docker-compose.yml
└── README.md
```

## 📄 许可证

MIT License

## 👨‍💻 作者

victoliang
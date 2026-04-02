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

### 方式一：手动安装

#### 1. 克隆仓库

\`\`\`bash
git clone https://git.woa.com/victoliang/gamecolla.git
cd gamecolla
\`\`\`

#### 2. 后端配置

\`\`\`bash
cd backend
npm install
cp .env.example .env
# 编辑 .env 配置数据库连接信息
npm run dev
\`\`\`

#### 3. 前端配置

\`\`\`bash
cd frontend
npm install
npm run dev
\`\`\`

访问 http://localhost:5173

### 方式二：Docker 部署

\`\`\`bash
docker-compose up -d
\`\`\`

## 📁 项目结构

\`\`\`
gamecolla/
├── backend/                 # 后端服务
│   ├── src/
│   │   ├── controllers/     # 控制器
│   │   ├── models/          # 数据模型
│   │   ├── routes/          # 路由
│   │   ├── services/        # 业务逻辑
│   │   ├── middleware/      # 中间件
│   │   ├── websocket/       # WebSocket 处理
│   │   ├── config/          # 配置文件
│   │   └── app.js           # 入口文件
│   └── package.json
│
├── frontend/                # 前端应用
│   ├── src/
│   │   ├── components/      # React 组件
│   │   ├── pages/           # 页面组件
│   │   ├── services/        # API 服务
│   │   ├── hooks/           # 自定义 Hooks
│   │   └── App.jsx          # 应用入口
│   └── package.json
│
├── docs/                    # 项目文档
├── docker-compose.yml       # Docker 配置
└── README.md
\`\`\`

## 🔧 环境变量配置

### 后端 (.env)

\`\`\`env
# 服务配置
PORT=3000
NODE_ENV=development

# 数据库
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gamecolla
DB_USER=postgres
DB_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# 存储路径
REPO_STORAGE_PATH=./repositories
\`\`\`

## 📚 API 文档

### 认证相关
- \`POST /api/auth/register\` - 用户注册
- \`POST /api/auth/login\` - 用户登录
- \`GET /api/auth/me\` - 获取当前用户信息

### 仓库管理
- \`GET /api/repos\` - 获取仓库列表
- \`POST /api/repos\` - 创建仓库
- \`GET /api/repos/:id\` - 获取仓库详情
- \`DELETE /api/repos/:id\` - 删除仓库

### 文件操作
- \`GET /api/files/:repoId/tree\` - 获取文件树
- \`GET /api/files/:repoId/blob\` - 获取文件内容
- \`POST /api/files/:repoId/commit\` - 提交文件变更

### 协作管理
- \`POST /api/collab/invite\` - 邀请协作者
- \`PUT /api/collab/accept/:id\` - 接受邀请
- \`GET /api/collab/pending\` - 获取待处理邀请

## 🚀 开发路线图

- [x] 项目初始化
- [x] 后端基础架构
- [x] 前端基础架构
- [ ] 用户认证模块
- [ ] 仓库管理模块
- [ ] Git 操作封装
- [ ] 实时协作编辑
- [ ] 权限管理系统
- [ ] 文件历史查看
- [ ] 单元测试
- [ ] 部署文档

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (\`git checkout -b feature/AmazingFeature\`)
3. 提交更改 (\`git commit -m '添加某个功能'\`)
4. 推送到分支 (\`git push origin feature/AmazingFeature\`)
5. 提交 Pull Request

## 📄 许可证

MIT License

## 👨‍💻 作者

victoliang

---

⭐️ 如果觉得项目有帮助，欢迎 Star！

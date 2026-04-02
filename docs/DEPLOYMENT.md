# GameColla 部署指南

## 📦 快速部署

### 方式一：Docker 部署（推荐）

1. **克隆仓库**
```bash
git clone https://git.woa.com/victoliang/gamecolla.git
cd gamecolla
```

2. **配置环境变量**
```bash
cp backend/.env.example backend/.env
# 编辑 backend/.env 修改数据库密码等配置
```

3. **启动服务**
```bash
docker-compose up -d
```

4. **访问应用**
- 前端: http://localhost:5173
- 后端 API: http://localhost:3000
- PostgreSQL: localhost:5432
- Redis: localhost:6379

### 方式二：本地开发部署

#### 前置要求
- Node.js >= 18
- PostgreSQL >= 14
- Redis >= 6

#### 步骤

**1. 安装后端依赖**
```bash
cd backend
npm install
cp .env.example .env
```

**2. 配置数据库**

编辑 `backend/.env`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gamecolla
DB_USER=postgres
DB_PASSWORD=your_password
```

创建数据库:
```sql
CREATE DATABASE gamecolla;
```

**3. 启动后端**
```bash
cd backend
npm run dev
```

后端会自动:
- 连接数据库
- 同步数据表结构  
- 启动在 http://localhost:3000

**4. 安装前端依赖**
```bash
cd frontend
npm install
```

**5. 启动前端**
```bash
cd frontend
npm run dev
```

前端会启动在 http://localhost:5173

## 🔧 配置说明

### 后端环境变量 (.env)

```env
# 服务器端口
PORT=3000

# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gamecolla
DB_USER=postgres
DB_PASSWORD=your_password

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT 密钥（生产环境请修改）
JWT_SECRET=your_jwt_secret_change_this
JWT_EXPIRES_IN=7d

# Git 仓库存储路径
REPO_STORAGE_PATH=./repositories

# CORS 配置
CORS_ORIGIN=http://localhost:5173
```

## 📊 数据库迁移

首次启动时，后端会自动创建以下表：

- `Users` - 用户表
- `Repositories` - 仓库表
- `Collaborators` - 协作者表

## 🚀 生产部署建议

1. **修改默认密码**
   - 数据库密码
   - JWT_SECRET
   
2. **配置 HTTPS**
   - 使用 Nginx 反向代理
   - 配置 SSL 证书

3. **性能优化**
   - 开启 PostgreSQL 查询缓存
   - 配置 Redis 持久化
   - 使用 PM2 管理 Node.js 进程

4. **监控告警**
   - 日志收集 (Winston)
   - 性能监控
   - 错误追踪

## 🐛 常见问题

### 数据库连接失败
检查 PostgreSQL 是否启动:
```bash
# Linux/Mac
sudo systemctl status postgresql

# Windows
# 检查服务管理器中的 PostgreSQL 服务
```

### Redis 连接失败
检查 Redis 是否启动:
```bash
redis-cli ping
# 应返回 PONG
```

### 端口被占用
修改 `.env` 中的 PORT 配置，或停止占用端口的进程。

## 📝 下一步

部署完成后，你可以:

1. 访问 http://localhost:5173 注册第一个用户
2. 创建第一个仓库
3. 邀请协作者
4. 开始协作编辑！

有问题? 查看 [API 文档](./API.md) 或提交 Issue。

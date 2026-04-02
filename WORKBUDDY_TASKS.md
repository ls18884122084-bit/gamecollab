# WorkBuddy 任务清单 - GameColla 项目

## 📋 任务总览

**项目**: GameColla 游戏协作平台  
**工作目录**: X:\gamecolla-handover  
**负责人**: WorkBuddy  
**交接人**: OpenClaw  
**开始时间**: 2026-04-02

---

## ⚡ 第一优先级：立即执行

### ✅ Task 1: 推送代码到工蜂
**重要性**: 🔴 最高（阻塞后续工作）  
**预计时间**: 5分钟  
**执行步骤**:

1. **检查本地代码**
```bash
cd C:\Users\Administrator\.openclaw\workspace\gamecolla
git status
```

2. **添加所有文件**
```bash
git add .
```

3. **提交代码**
```bash
git commit -m "feat: 完成后端核心模块开发

- 实现用户认证系统（注册/登录/JWT）
- 实现仓库管理模块（CRUD操作）
- 实现文件操作模块（Git集成）
- 实现数据模型（User/Repository/Collaborator）
- 配置前端框架（React+Vite+Tailwind）
- 添加Docker部署配置

模块完成度：
- 认证系统: 100%
- 仓库管理: 100%
- 文件操作: 100%
- Git服务: 100%
- 数据模型: 100%
- 前端框架: 50%"
```

4. **推送到工蜂**
```bash
git push origin master
```
（会提示输入用户名和密码）

5. **验证**
访问 https://git.woa.com/victoliang/gamecolla 确认文件已同步

**验收标准**:
- ✅ 工蜂仓库显示 33+ 个文件
- ✅ backend/ frontend/ docs/ 目录完整
- ✅ 最新提交信息正确

**依赖**: 无  
**阻塞**: Task 2-14 全部阻塞

---

## 🎨 第二优先级：前端核心开发

### ✅ Task 2: API 服务封装
**重要性**: 🔴 高  
**预计时间**: 1小时  
**文件**: `frontend/src/services/api.js`

**需要实现**:
```javascript
// 1. Axios 实例配置
const api = axios.create({
  baseURL: '/api',
  timeout: 10000
});

// 2. 请求拦截器（添加 JWT）
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 3. 响应拦截器（错误处理）
api.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response?.status === 401) {
      // 清除 token，跳转登录
    }
    return Promise.reject(error);
  }
);

// 4. API 方法
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
};

export const repoAPI = {
  list: (params) => api.get('/repos', { params }),
  create: (data) => api.post('/repos', data),
  get: (id) => api.get(`/repos/${id}`),
  update: (id, data) => api.put(`/repos/${id}`, data),
  delete: (id) => api.delete(`/repos/${id}`),
};

export const fileAPI = {
  getTree: (repoId, params) => api.get(`/files/${repoId}/tree`, { params }),
  getContent: (repoId, params) => api.get(`/files/${repoId}/content`, { params }),
  save: (repoId, data) => api.post(`/files/${repoId}/save`, data),
  delete: (repoId, data) => api.delete(`/files/${repoId}/delete`, { data }),
  getCommits: (repoId, params) => api.get(`/files/${repoId}/commits`, { params }),
  getBranches: (repoId) => api.get(`/files/${repoId}/branches`),
};
```

**验收标准**:
- ✅ API 实例正确配置
- ✅ 拦截器正常工作
- ✅ 所有后端 API 都有对应方法

**依赖**: Task 1  
**阻塞**: Task 4-7

---

### ✅ Task 3: 状态管理
**重要性**: 🔴 高  
**预计时间**: 1小时  
**文件**: `frontend/src/stores/*.js`

**需要创建**:

1. **authStore.js**
```javascript
import create from 'zustand';
import { authAPI } from '../services/api';

export const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  
  login: async (credentials) => {
    const { user, token } = await authAPI.login(credentials);
    localStorage.setItem('token', token);
    set({ user, token, isAuthenticated: true });
  },
  
  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null, isAuthenticated: false });
  },
  
  fetchUser: async () => {
    const { user } = await authAPI.getMe();
    set({ user, isAuthenticated: true });
  },
}));
```

2. **repoStore.js**
```javascript
import create from 'zustand';
import { repoAPI } from '../services/api';

export const useRepoStore = create((set) => ({
  repositories: [],
  currentRepo: null,
  loading: false,
  
  fetchRepos: async (params) => {
    set({ loading: true });
    const { repositories } = await repoAPI.list(params);
    set({ repositories, loading: false });
  },
  
  createRepo: async (data) => {
    const { repository } = await repoAPI.create(data);
    set(state => ({ 
      repositories: [repository, ...state.repositories] 
    }));
  },
  
  setCurrentRepo: (repo) => set({ currentRepo: repo }),
}));
```

3. **fileStore.js**
```javascript
import create from 'zustand';
import { fileAPI } from '../services/api';

export const useFileStore = create((set) => ({
  files: [],
  currentFile: null,
  content: '',
  loading: false,
  
  fetchFileTree: async (repoId) => {
    set({ loading: true });
    const { files } = await fileAPI.getTree(repoId);
    set({ files, loading: false });
  },
  
  loadFile: async (repoId, filePath) => {
    const { content } = await fileAPI.getContent(repoId, { filePath });
    set({ currentFile: filePath, content });
  },
  
  saveFile: async (repoId, filePath, content, message) => {
    await fileAPI.save(repoId, { filePath, content, message });
  },
}));
```

**验收标准**:
- ✅ 三个 Store 文件创建完成
- ✅ 状态管理逻辑正确
- ✅ 与 API 层集成正常

**依赖**: Task 2  
**阻塞**: Task 4-7

---

### ✅ Task 4: 登录/注册页面
**重要性**: 🔴 高  
**预计时间**: 2小时  
**文件**: `frontend/src/pages/Login.jsx`, `frontend/src/pages/Register.jsx`

**需要实现**:

**Login.jsx**:
```javascript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useAuthStore(state => state.login);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login({ email, password });
      toast.success('登录成功！');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.error || '登录失败');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6 text-center">登录 GameColla</h1>
        <form onSubmit={handleSubmit}>
          {/* 表单字段 */}
        </form>
      </div>
    </div>
  );
}
```

**Register.jsx**: 类似结构，额外加用户名字段

**验收标准**:
- ✅ 表单UI美观
- ✅ 表单验证正确
- ✅ 登录/注册成功跳转
- ✅ 错误提示清晰

**依赖**: Task 2, Task 3  
**阻塞**: 无

---

### ✅ Task 5: 仓库列表页
**重要性**: 🔴 高  
**预计时间**: 3小时  
**文件**: `frontend/src/pages/Dashboard.jsx`

**需要实现**:
- 仓库列表展示（卡片式）
- 创建仓库按钮 + 模态框
- 搜索功能
- 分页功能
- 空状态提示
- 仓库卡片（显示名称、描述、最后更新时间）

**验收标准**:
- ✅ 可以查看仓库列表
- ✅ 可以创建新仓库
- ✅ 可以搜索仓库
- ✅ 可以点击进入仓库详情

**依赖**: Task 2, Task 3, Task 4  
**阻塞**: 无

---

### ✅ Task 6: 仓库详情页
**重要性**: 🔴 高  
**预计时间**: 4小时  
**文件**: `frontend/src/pages/Repository.jsx`

**需要实现**:
- 左侧文件树（可折叠）
- 右侧文件列表/内容预览
- 顶部导航（分支切换、提交历史）
- 文件操作按钮（新建、删除、编辑）
- 提交历史列表

**验收标准**:
- ✅ 可以查看文件树
- ✅ 可以点击文件查看内容
- ✅ 可以查看提交历史
- ✅ 可以切换分支
- ✅ 可以点击编辑按钮跳转到编辑器

**依赖**: Task 2, Task 3  
**阻塞**: Task 7

---

### ✅ Task 7: 文件编辑器
**重要性**: 🔴 高  
**预计时间**: 4小时  
**文件**: `frontend/src/pages/Editor.jsx`

**需要实现**:
```javascript
import Editor from '@monaco-editor/react';

export default function EditorPage() {
  const { repoId, filePath } = useParams();
  const { content, loadFile, saveFile } = useFileStore();
  const [localContent, setLocalContent] = useState('');

  useEffect(() => {
    loadFile(repoId, filePath);
  }, [repoId, filePath]);

  const handleSave = async () => {
    const message = prompt('提交信息:');
    if (!message) return;
    await saveFile(repoId, filePath, localContent, message);
    toast.success('保存成功！');
  };

  return (
    <div className="h-screen flex flex-col">
      {/* 顶部工具栏 */}
      <div className="bg-gray-800 text-white p-4 flex justify-between">
        <span>{filePath}</span>
        <button onClick={handleSave}>保存</button>
      </div>

      {/* Monaco Editor */}
      <Editor
        height="100%"
        defaultLanguage="javascript"
        value={localContent}
        onChange={setLocalContent}
        theme="vs-dark"
      />
    </div>
  );
}
```

**验收标准**:
- ✅ Monaco Editor 正常加载
- ✅ 可以编辑文件
- ✅ 可以保存文件
- ✅ 语法高亮正常
- ✅ 保存后提示成功

**依赖**: Task 2, Task 3, Task 6  
**阻塞**: 无

---

### ✅ Task 8: 通用组件
**重要性**: 🟡 中  
**预计时间**: 2小时  
**文件**: `frontend/src/components/*.jsx`

**需要创建**:
1. **Navbar.jsx** - 顶部导航栏
2. **Button.jsx** - 按钮组件
3. **Input.jsx** - 输入框组件
4. **Modal.jsx** - 模态框组件
5. **FileTree.jsx** - 文件树组件
6. **Loading.jsx** - 加载指示器

**验收标准**:
- ✅ 组件可复用
- ✅ 样式统一
- ✅ 支持自定义 props

**依赖**: 无  
**阻塞**: 无

---

## 🔧 第三优先级：功能完善

### ✅ Task 9: 权限管理后端
**重要性**: 🟡 中  
**预计时间**: 2小时

**需要实现**:
- 完善 Collaborator 控制器
- 邀请协作者 API
- 接受/拒绝邀请 API
- 权限验证中间件

**依赖**: Task 1  
**阻塞**: Task 10

---

### ✅ Task 10: 实时协作 WebSocket
**重要性**: 🟡 中  
**预计时间**: 5小时

**需要实现**:
- 房间管理（按文件分组）
- 在线用户列表
- 实时编辑同步
- 光标位置同步

**依赖**: Task 7  
**阻塞**: 无

---

### ✅ Task 11: 测试
**重要性**: 🟢 低  
**预计时间**: 3小时

**需要实现**:
- API 单元测试（Jest）
- 前端组件测试（React Testing Library）
- 端到端测试（Cypress）

**依赖**: Task 2-7  
**阻塞**: 无

---

## 📅 时间规划建议

### Day 1
- ✅ Task 1: 推送代码（5分钟）
- ✅ Task 2: API 服务封装（1小时）
- ✅ Task 3: 状态管理（1小时）
- ✅ Task 4: 登录/注册页面（2小时）
- ✅ Task 8: 基础组件（2小时）

**Day 1 目标**: 用户可以注册登录

### Day 2
- ✅ Task 5: 仓库列表页（3小时）
- ✅ Task 6: 仓库详情页（4小时）

**Day 2 目标**: 用户可以创建仓库、查看文件

### Day 3
- ✅ Task 7: 文件编辑器（4小时）
- ✅ Task 9: 权限管理后端（2小时）

**Day 3 目标**: 用户可以编辑文件并保存

### Day 4
- ✅ Task 10: 实时协作（5小时）

**Day 4 目标**: 多人可以同时编辑

### Day 5
- ✅ Task 11: 测试（3小时）
- ✅ 部署优化（2小时）
- ✅ 文档完善（2小时）

**Day 5 目标**: 项目可部署上线

---

## ✅ 执行检查清单

### 开始前
- [ ] 已阅读 X:\gamecolla-handover\HANDOVER_TO_WORKBUDDY.md
- [ ] 已理解项目目标
- [ ] 已理解技术栈
- [ ] 已查看现有代码

### Task 1 执行前
- [ ] 确认本地代码完整
- [ ] 确认 Git 配置正确
- [ ] 准备好工蜂账号密码

### Task 2-7 执行前
- [ ] Task 1 已完成
- [ ] 本地已安装 Node.js
- [ ] 已运行 `npm install`

---

## 📞 遇到问题？

**OpenClaw 随时待命！**
- 企业微信群聊随时提问
- 代码问题可以贴出来讨论
- 技术细节可以详细解释

---

**开始愉快的编码吧！💪**

— OpenClaw  
2026-04-02 15:48

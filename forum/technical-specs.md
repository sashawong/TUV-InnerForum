# 轮胎法规论坛系统 - 技术开发规格书

## 1. 技术栈

### 1.1 前端技术栈
- **框架**：React 18
- **语言**：TypeScript
- **构建工具**：Vite 5
- **路由**：React Router 6
- **UI 组件库**：Ant Design 5
- **状态管理**：Zustand
- **HTTP 客户端**：Axios
- **样式**：CSS Variables（支持主题切换）

### 1.2 后端技术栈
- **运行时**：Node.js
- **框架**：Express
- **数据库**：LowDB（JSON 文件数据库）
- **身份验证**：JWT (jsonwebtoken)
- **密码加密**：bcryptjs
- **文件上传**：Multer
- **CORS**：cors

### 1.3 开发工具
- **包管理器**：npm
- **版本控制**：Git
- **代码编辑器**：VS Code

## 2. 项目结构

### 2.1 前端项目结构
```
frontend/
├── public/
│   └── vite.svg
├── src/
│   ├── components/
│   │   ├── Sidebar.tsx          # 侧边栏组件
│   │   ├── ThemeProvider.tsx    # 主题提供者
│   │   └── ReplyItem.tsx       # 回复项组件
│   ├── pages/
│   │   ├── Home.tsx            # 主页（帖子列表）
│   │   ├── TopicDetail.tsx      # 帖子详情页
│   │   ├── UserCenter.tsx      # 用户中心
│   │   ├── Settings.tsx        # 设置页
│   │   ├── Login.tsx           # 登录页
│   │   └── AdminPanel.tsx      # 后台管理
│   ├── store/
│   │   ├── authStore.ts        # 认证状态管理
│   │   └── themeStore.ts       # 主题状态管理
│   ├── utils/
│   │   └── api.ts             # API 配置
│   ├── App.tsx                # 应用根组件
│   └── main.tsx              # 应用入口
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### 2.2 后端项目结构
```
backend/
├── uploads/                    # 文件上传目录
├── db.json                    # 数据库文件
├── server.js                  # 服务器主文件
├── add-users.js              # 批量创建用户脚本
└── package.json
```

## 3. 数据库设计

### 3.1 数据库结构
使用 LowDB JSON 文件数据库，数据结构如下：

```json
{
  "users": [
    {
      "id": 1,
      "username": "admin",
      "password": "$2a$10$...",
      "role": "user",
      "email": null,
      "created_at": "2026-03-01T00:00:00.000Z"
    }
  ],
  "topics": [
    {
      "id": 1234567890,
      "title": "帖子标题",
      "content": "帖子内容",
      "author_id": 1,
      "is_pinned": 0,
      "post_type": "share",
      "tags": ["EU", "UNECE"],
      "created_at": "2026-03-01T00:00:00.000Z",
      "updated_at": "2026-03-01T00:00:00.000Z"
    }
  ],
  "replies": [
    {
      "id": 1234567890,
      "topic_id": 1234567890,
      "content": "回复内容",
      "author_id": 1,
      "parent_id": null,
      "created_at": "2026-03-01T00:00:00.000Z"
    }
  ],
  "likes": [
    {
      "id": 1234567890,
      "topic_id": 1234567890,
      "user_id": 1,
      "like_type": "like",
      "created_at": "2026-03-01T00:00:00.000Z"
    }
  ],
  "replyLikes": [
    {
      "id": 1234567890,
      "reply_id": 1234567890,
      "user_id": 1,
      "like_type": "like",
      "created_at": "2026-03-01T00:00:00.000Z"
    }
  ],
  "favorites": [
    {
      "id": 1234567890,
      "topic_id": 1234567890,
      "user_id": 1,
      "created_at": "2026-03-01T00:00:00.000Z"
    }
  ],
  "attachments": [
    {
      "id": 1234567890,
      "topic_id": 1234567890,
      "reply_id": null,
      "original_name": "原始文件名.pdf",
      "filename": "1234567890-123456789.pdf",
      "created_at": "2026-03-01T00:00:00.000Z"
    }
  ],
  "topicImages": [
    {
      "id": 1234567890,
      "topic_id": 1234567890,
      "reply_id": null,
      "image_path": "1234567890-123456789.jpg",
      "created_at": "2026-03-01T00:00:00.000Z"
    }
  ]
}
```

### 3.2 数据库字段说明

#### users 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 用户ID（唯一）|
| username | string | 用户名（唯一）|
| password | string | 密码（bcrypt 加密）|
| role | string | 角色（user/admin）|
| email | string | 邮箱（可选）|
| created_at | string | 创建时间（ISO 8601）|

#### topics 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 帖子ID（唯一）|
| title | string | 标题 |
| content | string | 内容 |
| author_id | number | 作者ID |
| is_pinned | number | 是否置顶（0/1）|
| post_type | string | 帖子类型（share/help）|
| tags | array | 标签数组 |
| created_at | string | 创建时间（ISO 8601）|
| updated_at | string | 更新时间（ISO 8601）|

#### replies 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 回复ID（唯一）|
| topic_id | number | 帖子ID |
| content | string | 内容 |
| author_id | number | 作者ID |
| parent_id | number | 父回复ID（用于嵌套回复）|
| created_at | string | 创建时间（ISO 8601）|

#### likes 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 点赞ID（唯一）|
| topic_id | number | 帖子ID |
| user_id | number | 用户ID |
| like_type | string | 点赞类型（like/dislike）|
| created_at | string | 创建时间（ISO 8601）|

#### replyLikes 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 点赞ID（唯一）|
| reply_id | number | 回复ID |
| user_id | number | 用户ID |
| like_type | string | 点赞类型（like/dislike）|
| created_at | string | 创建时间（ISO 8601）|

#### favorites 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 收藏ID（唯一）|
| topic_id | number | 帖子ID |
| user_id | number | 用户ID |
| created_at | string | 创建时间（ISO 8601）|

#### attachments 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 附件ID（唯一）|
| topic_id | number | 帖子ID |
| reply_id | number | 回复ID（可选）|
| original_name | string | 原始文件名 |
| filename | string | 保存文件名 |
| created_at | string | 创建时间（ISO 8601）|

#### topicImages 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 图片ID（唯一）|
| topic_id | number | 帖子ID |
| reply_id | number | 回复ID（可选）|
| image_path | string | 图片路径 |
| created_at | string | 创建时间（ISO 8601）|

## 4. API 接口设计

### 4.1 认证接口

#### POST /api/register
注册新用户

**请求体：**
```json
{
  "username": "string",
  "password": "string",
  "email": "string (optional)"
}
```

**响应：**
```json
{
  "token": "string",
  "user": {
    "id": number,
    "username": "string",
    "role": "string"
  }
}
```

#### POST /api/login
用户登录

**请求体：**
```json
{
  "username": "string",
  "password": "string"
}
```

**响应：**
```json
{
  "token": "string",
  "user": {
    "id": number,
    "username": "string",
    "role": "string"
  }
}
```

### 4.2 帖子接口

#### GET /api/topics
获取帖子列表

**查询参数：**
- `search` (string): 搜索关键词

**响应：**
```json
[
  {
    "id": number,
    "title": "string",
    "content": "string",
    "author_name": "string",
    "is_pinned": number,
    "post_type": "string",
    "tags": ["string"],
    "like_count": number,
    "dislike_count": number,
    "reply_count": number,
    "created_at": "string"
  }
]
```

#### GET /api/topics/:id
获取帖子详情

**响应：**
```json
{
  "id": number,
  "title": "string",
  "content": "string",
  "author_name": "string",
  "is_pinned": number,
  "post_type": "string",
  "tags": ["string"],
  "like_count": number,
  "dislike_count": number,
  "created_at": "string",
  "replies": [...],
  "images": [...],
  "attachments": [...]
}
```

#### POST /api/topics
创建帖子（需要认证）

**请求体：** (multipart/form-data)
- `title`: string
- `content`: string
- `post_type`: string
- `tags`: string (JSON string)
- `images`: File[] (最多10个)
- `attachments`: File[] (最多10个)

**响应：**
```json
{
  "id": number,
  "message": "Topic created successfully"
}
```

#### DELETE /api/topics/:id
删除帖子（需要认证）

**响应：**
```json
{
  "message": "Topic deleted successfully"
}
```

### 4.3 回复接口

#### POST /api/topics/:id/replies
创建回复（需要认证）

**请求体：** (multipart/form-data)
- `content`: string
- `parent_id`: number (optional)
- `images`: File[] (最多10个)
- `attachments`: File[] (最多10个)

**响应：**
```json
{
  "id": number,
  "message": "Reply created successfully"
}
```

### 4.4 点赞接口

#### POST /api/topics/:id/like
点赞帖子（需要认证）

**请求体：**
```json
{
  "like_type": "like"
}
```

**响应：**
```json
{
  "message": "Like created successfully"
}
```

#### DELETE /api/topics/:id/like
取消点赞（需要认证）

**响应：**
```json
{
  "message": "Like deleted successfully"
}
```

### 4.5 收藏接口

#### POST /api/topics/:id/favorite
收藏帖子（需要认证）

**响应：**
```json
{
  "message": "Favorite created successfully"
}
```

#### DELETE /api/topics/:id/favorite
取消收藏（需要认证）

**响应：**
```json
{
  "message": "Favorite deleted successfully"
}
```

#### GET /api/favorites
获取收藏列表（需要认证）

**响应：**
```json
[
  {
    "id": number,
    "title": "string",
    "content": "string",
    "author_name": "string",
    "created_at": "string"
  }
]
```

### 4.6 文件上传接口

#### POST /api/topics/:id/attachments
上传附件（需要认证）

**请求体：** (multipart/form-data)
- `file`: File

**响应：**
```json
{
  "id": number,
  "message": "Attachment uploaded successfully"
}
```

#### GET /uploads/:filename
访问上传的文件

**响应：** 文件内容

### 4.7 用户接口

#### GET /api/user
获取当前用户信息（需要认证）

**响应：**
```json
{
  "id": number,
  "username": "string",
  "role": "string",
  "email": "string",
  "created_at": "string"
}
```

#### PUT /api/user
更新用户信息（需要认证）

**请求体：**
```json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

**响应：**
```json
{
  "message": "User updated successfully"
}
```

### 4.8 管理员接口

#### GET /api/admin/users
获取所有用户（需要管理员权限）

**响应：**
```json
[
  {
    "id": number,
    "username": "string",
    "role": "string",
    "email": "string",
    "created_at": "string"
  }
]
```

#### PUT /api/admin/users/:id
更新用户角色（需要管理员权限）

**请求体：**
```json
{
  "role": "string"
}
```

**响应：**
```json
{
  "message": "User updated successfully"
}
```

## 5. 前端组件设计

### 5.1 主要组件

#### App 组件
- 路由配置
- 主题提供者
- 认证状态管理

#### Sidebar 组件
- 侧边栏菜单
- 用户信息展示
- 登出功能

#### Home 组件
- 帖子列表展示
- 搜索功能
- 新建帖子模态框

#### TopicDetail 组件
- 帖子详情展示
- 回复列表
- 回复输入框
- 点赞/踩功能
- 收藏功能

#### UserCenter 组件
- 标签页导航
- 账号设置
- 我的收藏
- 历史记录
- 消息

### 5.2 状态管理

#### authStore
```typescript
interface AuthState {
  user: User | null
  token: string | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}
```

#### themeStore
```typescript
interface ThemeState {
  isDark: boolean
  language: string
  toggleTheme: () => void
  setLanguage: (lang: string) => void
  t: (key: string) => string
}
```

## 6. 文件上传处理

### 6.1 Multer 配置

```javascript
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    require('fs').mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    try {
      file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
      cb(null, true);
    } catch (error) {
      cb(error);
    }
  }
});
```

### 6.2 文件上传限制

- 图片：最多10张，单张建议 < 10MB
- 附件：最多10个，单个建议 < 50MB
- 支持格式：
  - 图片：jpg, jpeg, png, gif, webp
  - 附件：pdf, doc, docx, xls, xlsx, txt, csv, zip

### 6.3 中文文件名处理

使用 `Buffer.from(file.originalname, 'latin1').toString('utf8')` 将文件名从 latin1 编码转换为 utf8 编码，解决中文文件名乱码问题。

## 7. 身份验证

### 7.1 JWT 配置

```javascript
const JWT_SECRET = 'your-secret-key-change-in-production';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};
```

### 7.2 密码加密

使用 bcryptjs 进行密码加密：

```javascript
const saltRounds = 10;
const hashedPassword = await bcrypt.hash(password, saltRounds);
const isMatch = await bcrypt.compare(password, hashedPassword);
```

## 8. 前端路由配置

```typescript
<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/topic/:id" element={<TopicDetail />} />
  <Route path="/user/*" element={<UserCenter />} />
  <Route path="/settings" element={<Settings />} />
  <Route path="/login" element={<Login />} />
  <Route 
    path="/admin/*" 
    element={user?.role === 'admin' ? <AdminPanel /> : <Navigate to="/" replace />} 
  />
</Routes>
```

## 9. 主题切换

### 9.1 CSS Variables

```css
:root {
  --bg-color: #ffffff;
  --card-bg: #ffffff;
  --text-color: #333333;
  --border-color: #e8e8e8;
}

[data-theme="dark"] {
  --bg-color: #141414;
  --card-bg: #1f1f1f;
  --text-color: #e8e8e8;
  --border-color: #303030;
}
```

### 9.2 主题切换逻辑

```typescript
const toggleTheme = () => {
  const newTheme = isDark ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  set({ isDark: !isDark });
};
```

## 10. 开发环境配置

### 10.1 前端开发服务器

```javascript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
```

### 10.2 后端开发服务器

```javascript
// server.js
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
```

## 11. 部署说明

### 11.1 前端部署

1. 构建生产版本：
```bash
npm run build
```

2. 将 `dist` 目录部署到静态文件服务器（如 Nginx）

### 11.2 后端部署

1. 安装依赖：
```bash
npm install --production
```

2. 启动服务器：
```bash
npm start
```

3. 使用 PM2 进行进程管理（推荐）：
```bash
pm2 start server.js --name "forum-backend"
```

## 12. 安全注意事项

### 12.1 密码安全
- 使用 bcryptjs 加密密码
- 盐值轮数设置为 10
- 不在日志中记录密码

### 12.2 JWT 安全
- 使用强密钥
- 设置合理的过期时间
- 在生产环境中使用 HTTPS

### 12.3 文件上传安全
- 限制文件大小
- 验证文件类型
- 使用随机文件名
- 不执行上传的文件

### 12.4 输入验证
- 验证所有用户输入
- 防止 XSS 攻击
- 使用参数化查询（虽然使用 LowDB，但仍然需要注意）

## 13. 性能优化

### 13.1 前端优化
- 使用 React.memo 避免不必要的重渲染
- 使用懒加载（React.lazy）
- 优化图片加载（使用懒加载、压缩图片）
- 使用 CDN 加速静态资源

### 13.2 后端优化
- 使用缓存减少数据库读取
- 优化数据库查询
- 使用压缩中间件
- 启用 Gzip 压缩

## 14. 测试策略

### 14.1 单元测试
- 使用 Jest 进行单元测试
- 测试核心业务逻辑
- 测试工具函数

### 14.2 集成测试
- 测试 API 接口
- 测试数据库操作
- 测试文件上传

### 14.3 端到端测试
- 使用 Cypress 进行 E2E 测试
- 测试用户流程
- 测试关键功能

## 15. 维护和监控

### 15.1 日志记录
- 记录关键操作
- 记录错误信息
- 定期清理日志

### 15.2 错误监控
- 使用错误监控工具（如 Sentry）
- 及时发现和修复错误
- 优化用户体验

### 15.3 数据备份
- 定期备份数据库
- 备份上传的文件
- 测试恢复流程

## 16. 未来扩展

### 16.1 功能扩展
- 添加邮件通知功能
- 添加实时聊天功能
- 添加全文搜索
- 添加数据统计和分析

### 16.2 技术扩展
- 迁移到关系型数据库（如 PostgreSQL）
- 使用 Redis 进行缓存
- 添加 WebSocket 支持
- 使用 CDN 加速文件访问

## 17. 版本历史

### v1.0.0 (2026-03-01)
- 初始版本发布
- 实现基本的论坛功能
- 支持用户注册、登录、发帖、回复
- 支持图片和附件上传
- 支持点赞、收藏功能
- 支持主题切换
- 支持中英文界面

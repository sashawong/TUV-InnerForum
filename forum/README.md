# 轮胎法规分享论坛

一个基于React + Node.js + SQLite的轮胎法规分享论坛系统。

## 功能特性

### 用户功能
- 用户注册和登录
- 浏览帖子列表（支持搜索）
- 创建新帖子（支持选择标签：UNECE、EU、MAS、TEST）
- 查看帖子详情（支持图片和附件）
- 点赞/反对帖子
- 收藏帖子
- 回复帖子
- 用户中心（账号设置、收藏、历史记录）

### 管理员功能
- 用户管理（创建、编辑、删除用户）
- 帖子管理（置顶、删除帖子）
- 后台管理面板

### 帖子功能
- 帖子类型：分享、求助
- 标签系统：UNECE、EU、MAS、TEST
- 置顶功能（管理员审核）
- 图片和附件上传
- 点赞/反对统计
- 回复功能

## 技术栈

### 前端
- React 18
- TypeScript
- Vite
- Ant Design
- React Router
- Axios
- Zustand（状态管理）

### 后端
- Node.js
- Express
- SQLite（better-sqlite3）
- JWT认证
- Multer（文件上传）
- bcryptjs（密码加密）

## 项目结构

```
forum/
├── backend/
│   ├── server.js          # 后端服务器
│   ├── init-db.js         # 数据库初始化
│   ├── package.json
│   └── uploads/           # 上传文件目录
└── frontend/
    ├── src/
    │   ├── components/    # 组件
    │   ├── pages/         # 页面
    │   ├── store/         # 状态管理
    │   └── utils/         # 工具函数
    ├── package.json
    └── vite.config.ts
```

## 安装和运行

### 后端

1. 进入后端目录：
```bash
cd forum/backend
```

2. 安装依赖：
```bash
npm install
```

3. 初始化数据库：
```bash
node init-db.js
```

4. 启动服务器：
```bash
npm start
```

后端服务器将在 `http://localhost:3001` 运行。

默认管理员账号：
- 用户名：admin
- 密码：admin123

### 前端

1. 进入前端目录：
```bash
cd forum/frontend
```

2. 安装依赖：
```bash
npm install
```

3. 启动开发服务器：
```bash
npm run dev
```

前端应用将在 `http://localhost:3000` 运行。

## API接口

### 认证
- POST `/api/auth/register` - 用户注册
- POST `/api/auth/login` - 用户登录

### 帖子
- GET `/api/topics` - 获取帖子列表（支持搜索）
- GET `/api/topics/:id` - 获取帖子详情
- POST `/api/topics` - 创建帖子
- PUT `/api/topics/:id` - 更新帖子
- DELETE `/api/topics/:id` - 删除帖子
- PUT `/api/topics/:id/pin` - 置顶/取消置顶帖子
- POST `/api/topics/:id/replies` - 回复帖子
- POST `/api/topics/:id/like` - 点赞/反对帖子
- POST `/api/topics/:id/favorite` - 收藏/取消收藏帖子
- POST `/api/topics/:id/images` - 上传图片
- POST `/api/topics/:id/attachments` - 上传附件

### 用户
- GET `/api/user/favorites` - 获取用户收藏
- GET `/api/user/history` - 获取用户历史记录

### 管理员
- GET `/api/admin/users` - 获取用户列表
- POST `/api/admin/users` - 创建用户
- PUT `/api/admin/users/:id` - 更新用户
- DELETE `/api/admin/users/:id` - 删除用户

## 数据库表结构

### users
- id: 用户ID
- username: 用户名
- password: 密码（加密）
- email: 邮箱
- role: 角色（user/admin）
- created_at: 创建时间

### topics
- id: 帖子ID
- title: 标题
- content: 内容
- author_id: 作者ID
- is_pinned: 是否置顶
- post_type: 帖子类型（share/help）
- tags: 标签
- created_at: 创建时间
- updated_at: 更新时间

### replies
- id: 回复ID
- topic_id: 帖子ID
- content: 内容
- author_id: 作者ID
- created_at: 创建时间

### likes
- id: 点赞ID
- topic_id: 帖子ID
- user_id: 用户ID
- like_type: 类型（like/dislike）
- created_at: 创建时间

### favorites
- id: 收藏ID
- user_id: 用户ID
- topic_id: 帖子ID
- created_at: 创建时间

### attachments
- id: 附件ID
- topic_id: 帖子ID
- filename: 文件名
- original_name: 原始文件名
- file_path: 文件路径
- file_size: 文件大小
- created_at: 创建时间

### topic_images
- id: 图片ID
- topic_id: 帖子ID
- image_path: 图片路径
- created_at: 创建时间

## 注意事项

1. 首次运行需要执行 `node init-db.js` 初始化数据库
2. 默认管理员账号密码为 admin/admin123，请及时修改
3. 上传的文件保存在 `backend/uploads` 目录
4. 前端开发服务器通过代理访问后端API
5. 生产环境部署时需要配置正确的API地址

## 开发建议

1. 使用 `npm run dev` 启动前端开发服务器（支持热更新）
2. 使用 `nodemon` 启动后端服务器（需要安装 `npm install -g nodemon`）
3. 建议使用 TypeScript 进行开发，提高代码质量
4. 遵循现有的代码风格和项目结构

## 许可证

MIT
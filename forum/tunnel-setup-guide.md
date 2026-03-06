# 轮胎法规论坛 - 反向穿透部署指南

## 方法一：使用 Ngrok（推荐）

### 1. 注册 Ngrok 账号
1. 访问 https://ngrok.com/
2. 点击 "Sign up" 注册账号
3. 登录后，访问 https://dashboard.ngrok.com/get-started/your-authtoken
4. 复制你的认证令牌（authtoken）

### 2. 配置 Ngrok
1. 打开命令行，进入项目目录
2. 运行以下命令配置 Ngrok：
   ```bash
   ngrok config add-authtoken 你的认证令牌
   ```

### 3. 启动 Ngrok 隧道

#### 方式 A：同时暴露前端和后端
```bash
# 在一个终端中启动前端隧道
ngrok http 3000

# 在另一个终端中启动后端隧道
ngrok http 3001
```

#### 方式 B：只暴露后端（推荐）
由于前端通过 Vite 代理访问后端，只需要暴露后端端口：
```bash
ngrok http 3001
```

### 4. 访问应用
启动成功后，Ngrok 会显示公网 URL，例如：
```
Forwarding: https://xxxx-xxxx-xxxx.ngrok-free.app -> http://localhost:3001
```

将此 URL 分享给其他人，他们就可以访问你的论坛了。

### 5. 配置前端访问后端
如果只暴露后端，需要修改前端的 API 配置：

#### 临时修改（开发环境）
修改 `frontend/src/utils/api.ts`：
```typescript
const api = axios.create({
  baseURL: 'https://xxxx-xxxx-xxxx.ngrok-free.app/api', // 替换为你的 Ngrok URL
  headers: {
    'Content-Type': 'application/json',
  },
})
```

#### 永久修改（生产环境）
修改 `frontend/vite.config.ts`：
```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://xxxx-xxxx-xxxx.ngrok-free.app', // 替换为你的 Ngrok URL
        changeOrigin: true
      },
      '/uploads': {
        target: 'https://xxxx-xxxx-xxxx.ngrok-free.app', // 替换为你的 Ngrok URL
        changeOrigin: true
      }
    }
  }
})
```

## 方法二：使用 Cloudflare Tunnel（免费且稳定）

### 1. 安装 Cloudflare Tunnel
```bash
npm install -g cloudflared
```

### 2. 登录 Cloudflare
```bash
cloudflared tunnel login
```
这会打开浏览器，让你登录 Cloudflare 账号

### 3. 创建隧道
```bash
cloudflared tunnel create forum-tunnel
```

### 4. 配置路由（可选）
如果你有自己的域名，可以配置 DNS 路由：
```bash
cloudflared tunnel route dns forum-tunnel your-domain.com
```

### 5. 启动隧道
```bash
cloudflared tunnel run forum-tunnel --url http://localhost:3001
```

### 6. 访问应用
启动成功后，会显示公网 URL，例如：
```
https://forum-tunnel.your-name.trycloudflare.com
```

## 方法三：使用 Localtunnel（无需注册）

### 1. 安装 Localtunnel
```bash
npm install -g localtunnel
```

### 2. 启动隧道
```bash
localtunnel --port 3001 --subdomain forum
```

### 3. 访问应用
会生成一个公网 URL，例如：
```
https://forum.localtunnel.me
```

## 方法四：使用 Serveo（无需注册）

### 1. 安装 Serveo
```bash
npm install -g serveo
```

### 2. 启动隧道
```bash
serveo -p 3001 -n forum
```

### 3. 访问应用
会生成一个公网 URL，例如：
```
https://forum.serveo.net
```

## 注意事项

### 1. 端口配置
- 前端端口：3000
- 后端端口：3001
- 确保这两个端口没有被其他程序占用

### 2. 防火墙设置
- 确保本地防火墙允许这些端口的入站连接

### 3. 稳定性
- 免费隧道服务可能有连接不稳定的情况
- 如果连接断开，重新启动隧道即可
- 建议使用 Cloudflare Tunnel，因为它更稳定

### 4. 安全性
- 不要在公网 URL 上分享敏感信息
- 定期更换隧道 URL（如果使用 Ngrok）
- 考虑使用自己的域名和 VPS 进行部署

### 5. 性能
- 隧道会增加网络延迟
- 对于大文件上传，可能需要更长时间
- 建议在本地测试时使用，正式部署时使用 VPS

## 快速开始指南

### 使用 Ngrok（最简单）
1. 访问 https://ngrok.com/ 注册账号
2. 获取认证令牌：https://dashboard.ngrok.com/get-started/your-authtoken
3. 运行：`ngrok config add-authtoken 你的令牌`
4. 运行：`ngrok http 3001`
5. 复制生成的 URL 并分享

### 使用 Cloudflare Tunnel（最稳定）
1. 运行：`npm install -g cloudflared`
2. 运行：`cloudflared tunnel login`
3. 运行：`cloudflared tunnel create forum-tunnel`
4. 运行：`cloudflared tunnel run forum-tunnel --url http://localhost:3001`
5. 复制生成的 URL 并分享

## 故障排除

### 问题：隧道无法启动
- 检查端口是否被占用
- 检查防火墙设置
- 尝试使用其他端口

### 问题：无法访问公网 URL
- 检查隧道是否正在运行
- 检查本地服务是否正常运行
- 尝试使用其他浏览器访问

### 问题：连接不稳定
- 尝试使用其他隧道服务
- 检查网络连接
- 考虑使用付费的隧道服务

## 推荐方案

对于开发和测试，推荐使用：
1. **Cloudflare Tunnel** - 免费、稳定、无需配置
2. **Ngrok** - 简单易用、功能丰富

对于生产环境，推荐使用：
1. **VPS + Nginx** - 稳定、可控
2. **云服务** - 阿里云、腾讯云等

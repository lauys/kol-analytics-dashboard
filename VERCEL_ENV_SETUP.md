# Vercel 环境变量配置指南

本文档详细说明如何在 Vercel 部署后配置环境变量。

## 📍 配置步骤

### 方法一：通过 Vercel Dashboard（推荐）

#### 步骤 1: 进入项目设置

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择你的项目（KOL Analytics Dashboard）
3. 点击项目名称进入项目详情页
4. 点击顶部导航栏的 **Settings**（设置）

#### 步骤 2: 进入环境变量页面

1. 在左侧菜单中找到 **Environment Variables**（环境变量）
2. 点击进入环境变量配置页面

#### 步骤 3: 添加环境变量

点击 **Add New**（添加新变量）按钮，逐个添加以下环境变量：

##### 必需的环境变量

**1. Supabase 配置（必需）**

```
Key: NEXT_PUBLIC_SUPABASE_URL
Value: https://your-project.supabase.co
Environment: Production, Preview, Development（全选）
```

```
Key: NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...（你的 anon key）
Environment: Production, Preview, Development（全选）
```

```
Key: SUPABASE_SERVICE_ROLE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...（你的 service_role key）
Environment: Production, Preview, Development（全选）
```

**2. Twitter API 配置（必需，用于数据采集）**

```
Key: TWITTER_API_KEY
Value: your_twitter_api_key_here
Environment: Production, Preview, Development（全选）
```

**3. Cron 任务安全配置（生产环境必需）**

```
Key: CRON_SECRET
Value: your_random_secret_string_here（使用下面命令生成）
Environment: Production（仅生产环境）
```

**4. 自动采集开关（可选）**

```
Key: ENABLE_AUTO_COLLECTION
Value: true
Environment: Production（仅生产环境）
```

#### 步骤 4: 选择环境范围

对于每个环境变量，选择它应该应用的环境：

- **Production**（生产环境）：用于正式部署
- **Preview**（预览环境）：用于 Pull Request 预览
- **Development**（开发环境）：用于本地开发（如果使用 Vercel CLI）

**建议配置**：
- `NEXT_PUBLIC_*` 变量：选择所有环境（Production, Preview, Development）
- `SUPABASE_SERVICE_ROLE_KEY`：选择所有环境
- `TWITTER_API_KEY`：选择所有环境
- `CRON_SECRET`：仅选择 Production
- `ENABLE_AUTO_COLLECTION`：仅选择 Production

#### 步骤 5: 保存并重新部署

1. 添加完所有环境变量后，点击 **Save**（保存）
2. 返回项目首页，点击 **Deployments**（部署）
3. 找到最新的部署，点击右侧的 **⋯**（三个点）菜单
4. 选择 **Redeploy**（重新部署）
5. 确认重新部署，等待部署完成

### 方法二：使用 Vercel CLI

如果你更喜欢使用命令行，可以使用 Vercel CLI：

#### 安装 Vercel CLI

```bash
npm i -g vercel
```

#### 登录 Vercel

```bash
vercel login
```

#### 链接项目

```bash
cd kol-analytics-dashboard
vercel link
```

#### 添加环境变量

```bash
# 添加 Supabase URL
vercel env add NEXT_PUBLIC_SUPABASE_URL production

# 添加 Supabase Anon Key
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production

# 添加 Supabase Service Role Key
vercel env add SUPABASE_SERVICE_ROLE_KEY production

# 添加 Twitter API Key
vercel env add TWITTER_API_KEY production

# 添加 Cron Secret
vercel env add CRON_SECRET production

# 添加自动采集开关
vercel env add ENABLE_AUTO_COLLECTION production
```

每次添加时，CLI 会提示你输入值，并询问应用的环境（Production/Preview/Development）。

#### 查看环境变量

```bash
vercel env ls
```

#### 拉取环境变量到本地

```bash
vercel env pull .env.local
```

## 🔑 获取环境变量值

### 获取 Supabase 凭证

1. 访问 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择你的项目
3. 进入 **Settings** → **API**
4. 复制以下值：
   - **Project URL** → 用于 `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → 用于 `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → 用于 `SUPABASE_SERVICE_ROLE_KEY`（点击 "Reveal" 显示）

### 获取 Twitter API Key

1. 访问 [https://twitter.good6.top](https://twitter.good6.top)
2. 注册账号并登录
3. 进入用户中心
4. 复制你的 API Key → 用于 `TWITTER_API_KEY`

### 生成 CRON_SECRET

使用以下命令生成一个安全的随机字符串：

```bash
# 在本地终端运行
openssl rand -base64 32

# 或使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

将生成的字符串复制，用作 `CRON_SECRET` 的值。

## 📋 完整环境变量列表

以下是所有需要配置的环境变量：

| 变量名 | 必需 | 环境范围 | 说明 |
|--------|------|----------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | 全部 | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | 全部 | Supabase 匿名密钥 |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | 全部 | Supabase 服务角色密钥 |
| `TWITTER_API_KEY` | ✅ | 全部 | Twitter API 密钥 |
| `CRON_SECRET` | ✅ | Production | Cron 任务认证密钥 |
| `ENABLE_AUTO_COLLECTION` | ⚪ | Production | 启用自动采集（设为 "true"） |

## ⚠️ 重要注意事项

### 1. NEXT_PUBLIC_* 变量

- `NEXT_PUBLIC_*` 前缀的变量会被暴露到客户端代码中
- 这些变量在构建时会被内联到 JavaScript bundle 中
- **不要**在这些变量中存储敏感信息（如服务角色密钥）

### 2. 环境变量更新后需要重新部署

- 修改环境变量后，**必须重新部署**才能生效
- Vercel 不会自动重新部署，需要手动触发

### 3. 不同环境使用不同值

- 可以为 Production、Preview、Development 设置不同的值
- 例如：开发环境可以使用测试数据库，生产环境使用正式数据库

### 4. 敏感信息保护

- `SUPABASE_SERVICE_ROLE_KEY` 和 `CRON_SECRET` 是敏感信息
- 不要将这些值提交到 Git 仓库
- 在 Vercel Dashboard 中，这些值会被隐藏显示（显示为 `••••••••`）

### 5. 验证配置

部署后，可以通过以下方式验证环境变量是否正确：

1. **检查构建日志**：在 Vercel Dashboard 的部署详情中查看构建日志
2. **检查运行时错误**：访问应用，查看浏览器控制台是否有错误
3. **测试 API 端点**：尝试调用需要环境变量的 API

## 🔍 验证环境变量配置

### 方法 1: 查看构建日志

1. 在 Vercel Dashboard 中进入项目
2. 点击 **Deployments**（部署）
3. 点击最新的部署
4. 查看 **Build Logs**（构建日志）
5. 检查是否有环境变量相关的错误

### 方法 2: 创建测试 API 端点

创建一个测试 API 来验证环境变量（仅用于调试，完成后删除）：

```typescript
// app/api/test-env/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasTwitterApiKey: !!process.env.TWITTER_API_KEY,
    hasCronSecret: !!process.env.CRON_SECRET,
    enableAutoCollection: process.env.ENABLE_AUTO_COLLECTION,
  })
}
```

访问 `https://your-domain.vercel.app/api/test-env` 查看环境变量状态。

### 方法 3: 检查应用功能

- 尝试登录/注册（验证 Supabase 连接）
- 尝试导入 KOL（验证 Twitter API）
- 检查 Cron 任务是否执行（验证 CRON_SECRET）

## 🐛 常见问题

### 问题 1: 环境变量已设置但应用仍报错

**解决方案**：
1. 确认已重新部署项目
2. 检查环境变量的环境范围是否正确（是否选择了 Production）
3. 检查变量名是否正确（注意大小写）
4. 检查变量值是否正确（没有多余的空格）

### 问题 2: NEXT_PUBLIC_* 变量不生效

**解决方案**：
1. 确认变量名以 `NEXT_PUBLIC_` 开头
2. 重新构建和部署项目
3. 清除浏览器缓存

### 问题 3: Cron 任务返回 401 未授权

**解决方案**：
1. 确认 `CRON_SECRET` 已设置
2. 确认 `CRON_SECRET` 仅应用于 Production 环境
3. 检查 `vercel.json` 中的 cron 配置是否正确
4. Vercel 会自动在请求头中添加 `Authorization: Bearer <CRON_SECRET>`

### 问题 4: 如何批量导入环境变量

**解决方案**：
1. 使用 Vercel CLI 的 `vercel env pull` 导出现有环境变量
2. 编辑 `.env.local` 文件
3. 使用 `vercel env add` 逐个添加，或
4. 在 Dashboard 中手动逐个添加

## 📚 相关文档

- [Vercel 环境变量文档](https://vercel.com/docs/concepts/projects/environment-variables)
- [Next.js 环境变量文档](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Supabase 环境变量指南](./ENV_SETUP.md)
- [部署准备指南](./DEPLOYMENT_GUIDE.md)

---

**提示**：配置完环境变量后，记得重新部署项目才能生效！







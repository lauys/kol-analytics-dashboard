# 环境变量配置指南

## 问题
如果遇到错误：`Your project's URL and Key are required to create a Supabase client!`

说明缺少 Supabase 环境变量配置。

## 解决步骤

### 1. 创建 `.env.local` 文件

在项目根目录创建 `.env.local` 文件（此文件不会被提交到 Git）。

### 2. 配置 Supabase 环境变量

#### 获取 Supabase 凭证：

1. 访问 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择你的项目（或创建新项目）
3. 进入 **Settings** → **API**
4. 复制以下值：
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`（需要点击 "Reveal" 显示）

#### 在 `.env.local` 中添加：

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### 3. 配置 Twitter API（可选）

如果需要真实数据采集，需要配置 Twitter API：

1. 访问 [https://twitter.good6.top](https://twitter.good6.top)
2. 注册并获取 API Key
3. 在 `.env.local` 中添加：

```env
# Twitter API Configuration
TWITTER_API_KEY=your_twitter_api_key_here
```

**注意**：如果不配置 Twitter API，应用会使用模拟数据运行。

### 4. 配置 Cron Secret（生产环境）

如果部署到生产环境，需要配置 Cron Secret：

```env
# Cron Job Security
CRON_SECRET=your_random_secret_string_here
```

### 5. 完整的 `.env.local` 示例

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Twitter API Configuration (可选)
TWITTER_API_KEY=your_twitter_api_key_here

# Cron Job Security (生产环境)
CRON_SECRET=your_random_secret_string_here
```

### 6. 重启开发服务器

配置完成后，重启开发服务器：

```bash
# 停止当前服务器 (Ctrl+C)
# 然后重新启动
npm run dev
```

## 数据库设置

配置环境变量后，还需要设置数据库：

1. 在 Supabase Dashboard 中，进入 **SQL Editor**
2. 按顺序执行 `scripts/` 目录中的 SQL 迁移脚本：
   - `001_create_kols_table.sql`
   - `002_create_snapshots_table.sql`
   - `003_create_leaderboard_view.sql`
   - 等等...

详细说明请参考 `README.md` 中的 "Database Setup" 部分。

## 验证配置

配置完成后，访问 http://localhost:3000，应该能够正常加载页面（即使没有数据）。

如果仍然遇到错误，请检查：
- `.env.local` 文件是否在项目根目录
- 环境变量名称是否正确（注意大小写）
- 是否重启了开发服务器
- Supabase 项目是否已创建并激活




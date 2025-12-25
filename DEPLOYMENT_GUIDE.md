# KOL Analytics Dashboard 服务器部署指南

本文档详细说明如何将 KOL Analytics Dashboard 部署到自己的服务器上（云服务器或物理机）。

---

## 📋 目录

1. [服务器环境要求](#1-服务器环境要求)
2. [环境变量配置](#2-环境变量配置)
3. [数据库选择](#3-数据库选择)
4. [数据库初始化](#4-数据库初始化)
5. [项目架构说明](#5-项目架构说明)
6. [前端部署](#6-前端部署)
7. [后端部署](#7-后端部署)
8. [构建和启动服务](#8-构建和启动服务)
9. [配置反向代理和 HTTPS](#9-配置反向代理和-https)
10. [配置定时任务](#10-配置定时任务)
11. [创建管理员账号](#11-创建管理员账号)
12. [首次数据采集](#12-首次数据采集)
13. [部署后验证](#13-部署后验证)
14. [监控和维护](#14-监控和维护)
15. [常见问题排查](#15-常见问题排查)

---

## 1. 服务器环境要求

### 基础要求

- **操作系统**: Linux（推荐 Ubuntu 20.04+ 或 Ubuntu 22.04 LTS）
- **Node.js**: 版本 18.x 或更高（推荐 20.x LTS）
- **包管理器**: npm、yarn 或 pnpm（三选一）
- **内存**: 至少 2GB RAM（推荐 4GB+）
- **存储**: 至少 10GB 可用空间
- **网络**: 能够访问 Supabase 和 Twitter API

### 验证环境

```bash
# 检查 Node.js 版本
node --version  # 应显示 v18.x 或更高

# 检查 npm 版本
npm --version   # 应显示 9.x 或更高

# 检查系统信息（可选）
uname -a
free -h
df -h
```

### 安装 Node.js（如果未安装）

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version
npm --version
```

---

## 2. 环境变量配置

### 创建环境变量文件

在项目根目录创建 `.env.production` 文件：

```bash
cd /path/to/kol-analytics-dashboard
nano .env.production
```

### 必需的环境变量

将以下内容复制到 `.env.production` 文件中，并替换为你的实际值：

```env
# ============================================
# Supabase 数据库配置（必需）
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ============================================
# Twitter API 配置（必需，用于数据采集）
# ============================================
TWITTER_API_KEY=your_twitter_api_key_here

# ============================================
# Cron 任务安全配置（生产环境必需）
# ============================================
CRON_SECRET=your_random_secret_string_here

# ============================================
# 自动采集开关（可选）
# ============================================
# 设置为 "true" 启用自动采集，不设置或设置为其他值则禁用
ENABLE_AUTO_COLLECTION=true

# ============================================
# Next.js 生产环境配置（可选）
# ============================================
NODE_ENV=production
```

### 获取 Supabase 凭证

1. 访问 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择你的项目（如果没有，先创建一个新项目）
3. 进入 **Settings** → **API**
4. 复制以下值：
   - **Project URL** → 填入 `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → 填入 `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → 填入 `SUPABASE_SERVICE_ROLE_KEY`（需要点击 "Reveal" 按钮显示）

### 获取 Twitter API Key

1. 访问 [https://twitter.good6.top](https://twitter.good6.top)
2. 注册账号并登录
3. 进入用户中心
4. 复制你的 API Key → 填入 `TWITTER_API_KEY`

### 生成 CRON_SECRET

使用以下命令生成一个安全的随机字符串：

```bash
# Linux/macOS
openssl rand -base64 32

# 或使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

将生成的字符串复制，填入 `.env.production` 文件中的 `CRON_SECRET`。

### 保护环境变量文件

确保 `.env.production` 文件不会被提交到 Git：

```bash
# 检查 .gitignore 是否包含 .env*
cat .gitignore | grep env

# 如果没有，添加到 .gitignore
echo ".env*" >> .gitignore
```

---

## 3. 数据库选择

### 数据库选项

本项目支持两种数据库部署方式：

1. **Supabase 云服务**（默认，推荐用于生产环境）
   - 托管服务，无需维护
   - 自动备份和扩展
   - 包含认证、存储等完整功能

2. **本地数据库**（推荐用于开发或私有部署）
   - 使用 Supabase 本地开发环境（推荐）
   - 或使用纯 PostgreSQL（需要更多配置）

### 选择建议

| 场景 | 推荐方案 |
|------|---------|
| 生产环境（公开服务） | Supabase 云服务 |
| 开发/测试环境 | Supabase 本地环境 |
| 私有部署（数据敏感） | Supabase 本地环境或纯 PostgreSQL |
| 完全自主控制 | 纯 PostgreSQL（需要代码修改） |

### 从 Supabase 云迁移到本地数据库

如果你需要从 Supabase 云服务迁移到本地数据库，请参考：

📖 **[本地数据库迁移指南](./LOCAL_DATABASE_MIGRATION.md)**

该指南包含：
- 两种迁移方案（Supabase 本地 vs 纯 PostgreSQL）
- 详细的数据导出和导入步骤
- 代码修改说明
- 验证和测试方法

---

## 4. 数据库初始化

### 使用 Supabase 云服务（默认）

如果你使用 Supabase 云服务，按照以下步骤初始化数据库：

#### 步骤 1: 访问 Supabase Dashboard

1. 访问 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择你的项目（如果没有，先创建一个新项目）
3. 进入 **SQL Editor**

#### 步骤 2: 执行 SQL 脚本

按以下顺序执行 SQL 脚本（**只执行必要的脚本**）：

#### 必需执行的 SQL 脚本列表

按顺序执行以下脚本（每个脚本执行完成后，再执行下一个）：

1. **`scripts/001_create_kols_table.sql`** - 创建 KOL 主表
2. **`scripts/002_create_snapshots_table.sql`** - 创建历史快照表
3. **`scripts/003_create_leaderboard_view.sql`** - 创建 24 小时排行榜视图（基础版本）
4. **`scripts/004_create_multi_period_views.sql`** - 创建 7 天和 30 天排行榜视图
5. **`scripts/005_create_growth_rpc_functions.sql`** - 创建增长排行 RPC 函数
6. **`scripts/005_create_users_table.sql`** - 创建用户表和权限系统
7. **`scripts/006_create_tweet_activity_stats.sql`** - 创建推文活跃度统计视图
8. **`scripts/006_update_rls_policies.sql`** - 更新行级安全策略
9. **`scripts/007_fix_kols_table.sql`** - 修复并增强 KOL 表结构
10. **`scripts/008_update_leaderboard_view.sql`** - 更新 24 小时排行榜视图（兼容新字段）
11. **`scripts/012_enhance_kols_table.sql`** - 增强 KOL 表（添加 tier、manual_score、bio_history、tweet_snapshots 等）
12. **`scripts/013_add_tweet_unique_constraint.sql`** - 为推文快照表添加唯一约束
13. **`scripts/014_create_api_logs_table.sql`** - 创建 API 日志表
14. **`scripts/015_add_is_hidden_to_kols.sql`** - 添加 is_hidden 字段并更新视图

#### 按需执行的脚本（可选）

以下脚本根据实际需要执行：

- **`scripts/009_create_admin_user.sql`** - 将指定邮箱的用户升级为管理员（需要修改脚本中的邮箱地址）
- **`scripts/010_set_admin_email.sql`** - 为特定测试邮箱设置管理员权限（仅用于测试）
- **`scripts/011_clear_mock_data.sql`** - 清空所有测试数据（**谨慎使用，会删除所有数据**）

#### 步骤 3: 执行方法

1. 打开 Supabase Dashboard → SQL Editor
2. 点击 "New query"
3. 打开项目中的 SQL 文件（例如 `scripts/001_create_kols_table.sql`）
4. 复制文件内容到 SQL Editor
5. 点击 "Run" 执行
6. 确认执行成功（没有错误提示）
7. 继续执行下一个脚本

#### 步骤 4: 验证数据库初始化

执行完所有必需脚本后，验证表是否创建成功：

```sql
-- 在 Supabase SQL Editor 中执行
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

应该能看到以下表：
- `kols`
- `snapshots`
- `profiles`
- `bio_history`
- `tweet_snapshots`
- `api_logs`

### 使用本地数据库

如果你选择使用本地数据库，请按照以下步骤：

#### 选项 A: 使用 Supabase 本地开发环境（推荐）

这是最简单的本地数据库方案，几乎无需修改代码。

**前置要求**：
- Docker 和 Docker Compose
- Supabase CLI

**快速开始**：

```bash
# 1. 安装 Supabase CLI
npm install -g supabase

# 2. 初始化项目
supabase init

# 3. 启动本地服务
supabase start

# 4. 执行数据库迁移
# 将 scripts/ 目录中的 SQL 脚本复制到 supabase/migrations/ 并按顺序执行
# 或直接在 Supabase Studio (http://localhost:54323) 中执行

# 5. 更新环境变量
# NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
# NEXT_PUBLIC_SUPABASE_ANON_KEY=从 supabase start 输出获取
# SUPABASE_SERVICE_ROLE_KEY=从 supabase start 输出获取
```

**详细步骤请参考**：[本地数据库迁移指南](./LOCAL_DATABASE_MIGRATION.md)

#### 选项 B: 使用纯 PostgreSQL

如果你需要完全自主控制，可以使用纯 PostgreSQL，但需要修改代码。

**前置要求**：
- PostgreSQL 14+ 已安装

**快速开始**：

```bash
# 1. 安装 PostgreSQL
sudo apt install postgresql postgresql-contrib

# 2. 创建数据库
sudo -u postgres psql
CREATE DATABASE kol_analytics;
CREATE USER kol_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE kol_analytics TO kol_user;
\q

# 3. 执行 SQL 脚本
psql -h localhost -U kol_user -d kol_analytics -f scripts/001_create_kols_table.sql
# ... 依此类推

# 4. 修改代码以使用 PostgreSQL 客户端（需要大量代码修改）
```

**详细步骤请参考**：[本地数据库迁移指南](./LOCAL_DATABASE_MIGRATION.md) - 方案二

---

## 5. 项目架构说明

### 技术栈

本项目使用 **Next.js 16** 全栈框架，采用 **App Router** 架构：

- **前端部分**：React 组件、页面、UI 界面
- **后端部分**：API 路由、服务器端逻辑、数据采集任务

### 项目结构

```
kol-analytics-dashboard/
├── app/                    # Next.js App Router
│   ├── page.tsx           # 前端：首页
│   ├── layout.tsx         # 前端：布局组件
│   ├── auth/             # 前端：登录/注册页面
│   ├── kol/              # 前端：KOL 详情页面
│   ├── admin/             # 前端：管理员页面
│   └── api/               # 后端：API 路由
│       ├── kols/         # 后端：KOL 数据 API
│       ├── admin/         # 后端：管理员 API
│       └── cron/          # 后端：定时任务 API
├── components/            # 前端：React 组件
├── lib/                   # 共享：工具函数、类型定义
└── scripts/               # 数据库脚本、数据采集脚本
```

### 部署方式

**Next.js 全栈应用采用一体化部署**：
- 前端页面和后端 API 路由在同一个 Node.js 进程中运行
- 构建时，Next.js 会同时处理前端静态资源和后端 API 路由
- 运行时，一个 Next.js 服务器同时提供前端页面渲染和 API 服务

---

## 6. 前端部署

### 前端组成部分

前端包括以下内容：

1. **页面组件**（`app/` 目录）
   - 首页：`app/page.tsx`
   - 登录/注册：`app/auth/login/`, `app/auth/sign-up/`
   - KOL 详情：`app/kol/[id]/page.tsx`
   - 管理员设置：`app/admin/setup/page.tsx`

2. **UI 组件**（`components/` 目录）
   - 表格、图表、对话框等可复用组件
   - 使用 Tailwind CSS 和 Radix UI

3. **静态资源**
   - CSS 样式文件
   - 图片、图标等资源

### 前端部署步骤

#### 步骤 1: 克隆代码仓库

```bash
# 如果使用 Git
git clone <your-repo-url>
cd kol-analytics-dashboard

# 或者直接上传代码到服务器
# 使用 scp、FTP 或其他方式将项目文件上传到服务器
```

#### 步骤 2: 安装前端依赖

```bash
# 进入项目目录
cd kol-analytics-dashboard

# 安装依赖（包含前端和后端的所有依赖）
npm install
# 或
yarn install
# 或
pnpm install
```

**说明**：Next.js 项目的依赖是统一的，前端和后端共享同一个 `node_modules`。

#### 步骤 3: 配置前端环境变量

确保 `.env.production` 文件已创建，并包含前端需要的环境变量：

```env
# 前端需要的环境变量（以 NEXT_PUBLIC_ 开头）
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

**重要**：`NEXT_PUBLIC_*` 前缀的变量会被编译到前端代码中，可以在浏览器中访问。

#### 步骤 4: 前端构建（与后端一起构建）

前端会在构建阶段被处理：

```bash
# 构建生产版本（同时构建前端和后端）
npm run build
```

构建过程中，Next.js 会：

1. **编译前端代码**
   - 编译 React 组件
   - 处理 TypeScript/JavaScript
   - 优化 CSS（Tailwind CSS）
   - 生成静态 HTML（如果可能）

2. **编译后端代码**
   - 编译 API 路由
   - 处理服务器端逻辑
   - 优化服务器端代码

3. **生成输出文件**
   - `.next/` 目录包含编译后的前端和后端代码
   - 静态资源会被优化和压缩

构建成功后，会看到类似输出：

```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages
✓ Finalizing page optimization
```

---

## 7. 后端部署

### 后端组成部分

后端包括以下内容：

1. **API 路由**（`app/api/` 目录）
   - **KOL 数据 API**：`app/api/kols/` - 获取 KOL 列表、详情、历史数据
   - **管理员 API**：`app/api/admin/` - 导入 KOL、数据采集、更新分数等
   - **定时任务 API**：`app/api/cron/` - 自动数据采集任务
   - **排行榜 API**：`app/api/rankings/` - 获取排行榜数据
   - **指标统计 API**：`app/api/metrics/` - 获取统计数据

2. **服务器端逻辑**
   - 数据库操作（Supabase）
   - Twitter API 调用
   - 数据采集和处理
   - 权限验证

### 后端部署步骤

#### 步骤 1: 配置后端环境变量

确保 `.env.production` 文件包含后端需要的环境变量：

```env
# 后端需要的环境变量
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
TWITTER_API_KEY=your_twitter_api_key_here
CRON_SECRET=your_cron_secret_here
ENABLE_AUTO_COLLECTION=true
```

**重要**：后端环境变量（没有 `NEXT_PUBLIC_` 前缀）只在服务器端可用，不会暴露到前端。

#### 步骤 2: 后端构建（与前端一起构建）

后端 API 路由会在构建阶段被编译：

```bash
# 构建生产版本（同时构建前端和后端）
npm run build
```

构建过程中，Next.js 会：

1. **编译 API 路由**
   - 将 `app/api/**/route.ts` 编译为服务器端代码
   - 处理 TypeScript 类型检查
   - 优化服务器端代码

2. **生成 API 路由映射**
   - Next.js 会自动识别所有 API 路由
   - 生成路由处理映射

#### 步骤 3: 验证后端 API 路由

构建完成后，可以检查 API 路由是否正确编译：

```bash
# 查看构建输出
ls -la .next/server/app/api/

# 应该能看到编译后的 API 路由文件
```

---

## 8. 构建和启动服务

### 一体化构建

Next.js 全栈应用使用一个命令同时构建前端和后端：

```bash
# 构建生产版本（前端 + 后端）
npm run build
```

**构建过程说明**：

1. **前端构建**
   - 编译 React 组件和页面
   - 生成静态 HTML（如果可能）
   - 优化 CSS 和 JavaScript
   - 输出到 `.next/static/`

2. **后端构建**
   - 编译 API 路由（`app/api/`）
   - 编译服务器组件
   - 输出到 `.next/server/`

3. **构建产物**
   - `.next/` 目录包含所有构建产物
   - 前端静态资源在 `.next/static/`
   - 后端代码在 `.next/server/`

### 启动生产服务

构建完成后，启动 Next.js 生产服务器：

#### 方式一：使用 PM2（推荐）

PM2 可以同时管理前端页面服务和后端 API 服务：

```bash
# 安装 PM2
npm install -g pm2

# 启动 Next.js 服务器（同时提供前端和后端服务）
pm2 start npm --name "kol-dashboard" -- start

# 查看状态
pm2 status

# 查看日志（包含前端和后端的日志）
pm2 logs kol-dashboard
```

**说明**：一个 Next.js 进程同时提供：
- 前端页面服务（SSR/SSG）
- 后端 API 服务（`/api/*` 路由）

#### 方式二：直接启动

```bash
# 启动生产服务器
NODE_ENV=production npm start

# 或后台运行
NODE_ENV=production nohup npm start > app.log 2>&1 &
```

### 服务架构说明

启动后的服务架构：

```
用户请求
    ↓
Nginx (反向代理)
    ↓
Next.js 服务器 (端口 3000)
    ├── 前端路由 (/)
    │   ├── 首页
    │   ├── 登录/注册
    │   ├── KOL 详情页
    │   └── 管理员页面
    │
    └── 后端 API (/api/*)
        ├── /api/kols - KOL 数据 API
        ├── /api/admin - 管理员 API
        ├── /api/cron - 定时任务 API
        └── /api/rankings - 排行榜 API
```

### 验证服务运行

```bash
# 测试前端页面
curl http://localhost:3000
# 应该返回 HTML 内容

# 测试后端 API
curl http://localhost:3000/api/kols
# 应该返回 JSON 数据

# 查看服务状态（如果使用 PM2）
pm2 status
pm2 logs kol-dashboard
```

### 配置 PM2 开机自启

```bash
# 生成启动脚本
pm2 startup

# 保存当前进程列表
pm2 save
```

---

## 9. 配置反向代理和 HTTPS

### 方式一：使用 PM2（推荐）

PM2 是一个 Node.js 进程管理器，可以保持应用运行、自动重启、监控等。

#### 安装 PM2

```bash
npm install -g pm2
```

#### 启动应用

```bash
# 使用 PM2 启动应用
pm2 start npm --name "kol-dashboard" -- start

# 查看状态
pm2 status

# 查看日志
pm2 logs kol-dashboard

# 查看详细信息
pm2 info kol-dashboard
```

#### 配置 PM2 开机自启

```bash
# 生成启动脚本
pm2 startup

# 保存当前进程列表
pm2 save
```

### 方式二：直接启动（不推荐用于生产）

```bash
# 直接启动（前台运行）
NODE_ENV=production npm start

# 或后台运行
NODE_ENV=production nohup npm start > app.log 2>&1 &
```

### 验证服务运行

```bash
# 测试本地访问
curl http://localhost:3000

# 应该返回 HTML 内容
```

---

## 6. 配置反向代理和 HTTPS

### 安装 Nginx

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx -y

# 启动 Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# 检查状态
sudo systemctl status nginx
```

### 配置 Nginx 反向代理

创建 Nginx 配置文件：

```bash
sudo nano /etc/nginx/sites-available/kol-dashboard
```

将以下内容复制到文件中（**记得替换 `your-domain.com` 为你的实际域名**）：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 日志配置
    access_log /var/log/nginx/kol-dashboard-access.log;
    error_log /var/log/nginx/kol-dashboard-error.log;

    # 反向代理到 Next.js 应用
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 静态文件缓存（可选）
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
    }
}
```

启用配置：

```bash
# 创建符号链接
sudo ln -s /etc/nginx/sites-available/kol-dashboard /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 如果测试通过，重载 Nginx
sudo systemctl reload nginx
```

### 配置 SSL（HTTPS）

使用 Let's Encrypt 免费 SSL 证书：

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx -y

# 获取 SSL 证书（替换 your-domain.com 为你的域名）
sudo certbot --nginx -d your-domain.com

# 按照提示操作：
# 1. 输入邮箱地址
# 2. 同意服务条款
# 3. 选择是否分享邮箱（可选）
# 4. 选择是否重定向 HTTP 到 HTTPS（推荐选择 2）
```

Certbot 会自动配置 Nginx 使用 HTTPS。

### 自动续期 SSL 证书

Let's Encrypt 证书每 90 天需要续期，Certbot 会自动配置定时任务：

```bash
# 测试自动续期
sudo certbot renew --dry-run

# 查看续期任务
sudo systemctl status certbot.timer
```

---

## 10. 配置定时任务

### 配置系统 Cron

编辑 crontab：

```bash
crontab -e
```

添加以下行（**记得替换 `your-domain.com` 和 `YOUR_CRON_SECRET`**）：

```bash
# 每天凌晨 2 点执行数据采集
0 2 * * * curl -X GET "https://your-domain.com/api/cron/collect-all" -H "Authorization: Bearer YOUR_CRON_SECRET" >> /var/log/kol-cron.log 2>&1

# 或者每小时执行一次（可选）
# 0 * * * * curl -X GET "https://your-domain.com/api/cron/collect-all" -H "Authorization: Bearer YOUR_CRON_SECRET" >> /var/log/kol-cron.log 2>&1
```

**重要提示**：
- 将 `your-domain.com` 替换为你的实际域名
- 将 `YOUR_CRON_SECRET` 替换为 `.env.production` 中的 `CRON_SECRET` 值
- 确保日志目录存在：`sudo mkdir -p /var/log && sudo touch /var/log/kol-cron.log && sudo chmod 666 /var/log/kol-cron.log`

### 测试 Cron 任务

```bash
# 手动测试 API 端点
curl -X GET "https://your-domain.com/api/cron/collect-all" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# 应该返回 JSON 响应，表示采集任务已启动
```

### 查看 Cron 日志

```bash
# 查看 cron 执行日志
tail -f /var/log/kol-cron.log

# 查看系统 cron 日志
sudo tail -f /var/log/syslog | grep CRON
```

---

## 11. 创建管理员账号

### 方式一：通过 UI 创建（推荐）

1. 访问 `https://your-domain.com/admin/setup`
2. 输入你的邮箱地址
3. 设置密码（至少 6 个字符）
4. 点击 "Create Admin Account"
5. 创建成功后，使用该邮箱和密码登录

### 方式二：通过 SQL 脚本创建

1. 先通过 `/auth/sign-up` 注册一个普通账号
2. 打开 `scripts/009_create_admin_user.sql`
3. 将脚本中的 `your-admin-email@example.com` 替换为你的邮箱
4. 在 Supabase SQL Editor 中执行该脚本
5. 使用该邮箱和密码登录

详细说明请参考 `ADMIN_SETUP.md`。

---

## 12. 首次数据采集

### 方式一：通过 UI 导入（推荐）

1. 使用管理员账号登录
2. 访问仪表盘
3. 点击 "导入 KOL" 按钮
4. 上传或输入 KOL 用户名列表
5. 等待导入完成

### 方式二：通过脚本批量导入

参考 `RUN_COLLECTION.md` 文档，运行数据采集脚本：

```bash
# 如果有 Node.js 脚本
node scripts/collect-kols-data.js

# 或使用 TypeScript（如果配置了 ts-node）
npx ts-node scripts/import-kols.ts
```

脚本会：
- 读取 `data/kol-list.csv` 文件
- 调用 Twitter API 获取每个 KOL 的数据
- 插入或更新数据库中的 KOL 记录
- 创建初始快照

### 方式三：手动触发 API

```bash
# 手动触发采集任务
curl -X GET "https://your-domain.com/api/cron/collect-all" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## 13. 部署后验证

### 检查清单

完成以下检查，确保部署成功：

- [ ] **应用可以正常访问**
  - 访问 `https://your-domain.com`，应该能看到登录页面

- [ ] **环境变量已正确设置**
  ```bash
  # 在服务器上检查（如果使用 PM2）
  pm2 env kol-dashboard | grep SUPABASE
  ```

- [ ] **数据库连接正常**
  - 尝试登录/注册账号，应该能成功

- [ ] **可以登录/注册账号**
  - 访问 `/auth/login` 或 `/auth/sign-up`

- [ ] **管理员功能正常**
  - 使用管理员账号登录
  - 应该能看到导入 KOL 等管理功能

- [ ] **可以导入 KOL 数据**
  - 作为管理员，尝试导入一个 KOL
  - 应该能成功导入并显示在列表中

- [ ] **Cron 任务可以正常执行**
  ```bash
  # 手动测试
  curl -X GET "https://your-domain.com/api/cron/collect-all" \
    -H "Authorization: Bearer YOUR_CRON_SECRET"
  ```

- [ ] **API 端点响应正常**
  - 访问 `/api/kols` 应该返回 KOL 列表（JSON）

### 测试命令

```bash
# 测试应用是否运行
curl http://localhost:3000

# 测试 HTTPS 访问
curl https://your-domain.com

# 测试 API 端点（需要认证）
curl -X GET "https://your-domain.com/api/cron/collect-all" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# 检查 PM2 状态
pm2 status

# 检查 Nginx 状态
sudo systemctl status nginx

# 查看应用日志
pm2 logs kol-dashboard --lines 50
```

---

## 14. 监控和维护

### PM2 监控命令

```bash
# 查看所有进程状态
pm2 status

# 查看实时日志
pm2 logs kol-dashboard

# 查看最近 100 行日志
pm2 logs kol-dashboard --lines 100

# 查看进程详细信息
pm2 info kol-dashboard

# 监控资源使用
pm2 monit

# 重启应用
pm2 restart kol-dashboard

# 停止应用
pm2 stop kol-dashboard

# 删除应用（从 PM2 中移除）
pm2 delete kol-dashboard
```

### 日志位置

- **PM2 日志**: `~/.pm2/logs/`
- **Nginx 访问日志**: `/var/log/nginx/kol-dashboard-access.log`
- **Nginx 错误日志**: `/var/log/nginx/kol-dashboard-error.log`
- **Cron 任务日志**: `/var/log/kol-cron.log`
- **系统日志**: `/var/log/syslog`

### 查看日志

```bash
# 查看 PM2 日志
tail -f ~/.pm2/logs/kol-dashboard-out.log
tail -f ~/.pm2/logs/kol-dashboard-error.log

# 查看 Nginx 日志
sudo tail -f /var/log/nginx/kol-dashboard-access.log
sudo tail -f /var/log/nginx/kol-dashboard-error.log

# 查看 Cron 日志
tail -f /var/log/kol-cron.log
```

### 定期维护任务

1. **更新系统**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **更新 Node.js 依赖**
   ```bash
   cd /path/to/kol-analytics-dashboard
   npm update
   npm audit fix
   ```

3. **备份数据库**
   - 在 Supabase Dashboard 中配置自动备份
   - 定期导出数据库快照

4. **清理日志**
   ```bash
   # 清理旧的 PM2 日志（保留最近 7 天）
   pm2 flush
   
   # 清理系统日志（可选）
   sudo journalctl --vacuum-time=7d
   ```

5. **监控磁盘空间**
   ```bash
   df -h
   ```

---

## 15. 常见问题排查

### 问题 1: 构建失败

**症状**: `npm run build` 报错

**可能原因**：
- 前端代码编译错误
- 后端 API 路由编译错误
- 环境变量缺失
- 依赖安装不完整

**解决方案**:
- 检查 Node.js 版本：`node --version`（应该是 v18+）
- 清理缓存和重新安装依赖：
  ```bash
  rm -rf .next node_modules package-lock.json
  npm install
  npm run build
  ```
- 检查环境变量是否完整（前端和后端都需要）
- 查看构建日志中的具体错误信息：
  ```bash
  npm run build 2>&1 | tee build.log
  ```
- 如果是前端错误，检查 `app/` 和 `components/` 目录
- 如果是后端错误，检查 `app/api/` 目录

### 问题 2: 应用无法启动

**症状**: PM2 显示应用状态为 "errored" 或 "stopped"

**可能原因**：
- 前端或后端代码错误
- 端口被占用
- 环境变量配置错误

**解决方案**:
- 查看错误日志：`pm2 logs kol-dashboard --err`
- 检查端口 3000 是否被占用：`sudo lsof -i :3000`
- 检查环境变量：`pm2 env kol-dashboard`
- 确认 `.env.production` 文件存在且格式正确
- 手动启动查看详细错误：
  ```bash
  NODE_ENV=production npm start
  ```
- 检查前端页面是否能访问：`curl http://localhost:3000`
- 检查后端 API 是否能访问：`curl http://localhost:3000/api/kols`

### 问题 3: 数据库连接失败

**症状**: 应用报错 "Your project's URL and Key are required" 或数据库连接错误

**可能原因**：
- Supabase 环境变量配置错误
- 本地数据库服务未启动
- 网络连接问题

**解决方案**:

**如果使用 Supabase 云服务**：
- 验证 Supabase 环境变量是否正确：
  ```bash
  pm2 env kol-dashboard | grep SUPABASE
  ```
- 检查 Supabase 项目是否激活
- 确认网络可以访问 Supabase（测试：`curl https://your-project.supabase.co`）
- 检查 `SUPABASE_SERVICE_ROLE_KEY` 是否正确（注意不要有多余空格）

**如果使用本地数据库（Supabase 本地）**：
- 检查 Supabase 本地服务是否运行：`supabase status`
- 确认端口 54321 未被占用：`sudo lsof -i :54321`
- 重启本地服务：`supabase stop && supabase start`
- 检查环境变量是否指向本地：`NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321`
- 查看 Supabase 日志：`supabase logs`

**如果使用纯 PostgreSQL**：
- 检查 PostgreSQL 服务是否运行：`sudo systemctl status postgresql`
- 验证数据库连接：`psql -h localhost -U kol_user -d kol_analytics`
- 检查环境变量（DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD）
- 查看 PostgreSQL 日志：`sudo tail -f /var/log/postgresql/postgresql-*.log`

### 问题 4: Nginx 502 Bad Gateway

**症状**: 访问网站显示 502 错误

**可能原因**：
- Next.js 服务器未启动
- 前端或后端服务异常
- Nginx 配置错误

**解决方案**:
- 检查 Next.js 应用是否运行：`pm2 status`
- 检查应用是否监听在 3000 端口：
  ```bash
  curl http://localhost:3000          # 测试前端
  curl http://localhost:3000/api/kols # 测试后端
  ```
- 查看 Nginx 错误日志：`sudo tail -f /var/log/nginx/kol-dashboard-error.log`
- 检查 Nginx 配置：`sudo nginx -t`
- 重启 Nginx：`sudo systemctl restart nginx`
- 检查 Next.js 服务器日志：`pm2 logs kol-dashboard`

### 问题 5: Cron 任务不执行

**症状**: 定时采集任务没有运行

**可能原因**：
- 后端 API 路由未正确部署
- CRON_SECRET 配置错误
- 后端服务异常

**解决方案**:
- 检查后端 API 是否可访问：
  ```bash
  curl http://localhost:3000/api/cron/collect-all \
    -H "Authorization: Bearer YOUR_CRON_SECRET"
  ```
- 检查 `CRON_SECRET` 是否设置正确
- 验证 `ENABLE_AUTO_COLLECTION=true` 是否设置
- 手动测试 API 端点：
  ```bash
  curl -X GET "https://your-domain.com/api/cron/collect-all" \
    -H "Authorization: Bearer YOUR_CRON_SECRET"
  ```
- 查看 Cron 日志：`tail -f /var/log/kol-cron.log`
- 检查 crontab 配置：`crontab -l`
- 查看系统 cron 日志：`sudo tail -f /var/log/syslog | grep CRON`
- 检查后端服务日志：`pm2 logs kol-dashboard | grep cron`

### 问题 6: Twitter API 调用失败

**症状**: 数据采集时提示 API 错误

**可能原因**：
- 后端 API 路由中的 Twitter API 调用失败
- API Key 无效或配额用完

**解决方案**:
- 验证 `TWITTER_API_KEY` 是否有效（后端环境变量）
- 检查 API 配额是否用完
- 查看后端服务日志了解具体错误：
  ```bash
  pm2 logs kol-dashboard | grep -i twitter
  pm2 logs kol-dashboard | grep -i api
  ```
- 检查网络连接：`curl https://twitter.good6.top`
- 手动测试后端 API：
  ```bash
  curl -X POST "http://localhost:3000/api/admin/collect-data" \
    -H "Content-Type: application/json" \
    -d '{"usernames": ["test"]}'
  ```

### 问题 7: SSL 证书续期失败

**症状**: Certbot 续期失败

**解决方案**:
- 手动测试续期：`sudo certbot renew --dry-run`
- 检查域名 DNS 解析是否正确
- 确保 80 端口开放（Let's Encrypt 验证需要）
- 查看 Certbot 日志：`sudo journalctl -u certbot.timer`

### 问题 8: 无法登录或注册

**症状**: 登录/注册页面报错

**可能原因**：
- 前端页面错误
- 后端认证 API 错误
- Supabase 配置问题

**解决方案**:
- 检查前端页面是否能正常加载：访问 `/auth/login`
- 检查后端认证 API：
  ```bash
  curl http://localhost:3000/api/auth/login
  ```
- 检查 Supabase 环境变量是否正确（前端需要 `NEXT_PUBLIC_SUPABASE_*`）
- 确认 `005_create_users_table.sql` 已执行
- 查看浏览器控制台错误信息（前端错误）
- 查看后端服务日志：`pm2 logs kol-dashboard | grep -i auth`
- 检查 Supabase Dashboard 中的 Authentication 设置
- 确认邮箱验证设置（如果启用了邮箱验证）

### 问题 9: 管理员权限不生效

**症状**: 登录后看不到管理功能

**可能原因**：
- 前端权限检查逻辑问题
- 后端 API 权限验证失败
- 数据库角色配置错误

**解决方案**:
- 确认用户角色为 `admin`：
  ```sql
  -- 在 Supabase SQL Editor 中执行
  SELECT email, role FROM public.profiles WHERE email = 'your-email@example.com';
  ```
- 如果角色不是 `admin`，执行 `009_create_admin_user.sql` 脚本
- 检查前端权限检查逻辑（查看浏览器控制台）
- 检查后端 API 权限验证：
  ```bash
  # 测试管理员 API（需要认证）
  curl http://localhost:3000/api/admin/import-kols
  ```
- 查看后端服务日志：`pm2 logs kol-dashboard | grep -i admin`
- 清除浏览器缓存和 Cookie，重新登录
- 检查 RLS 策略是否正确（确认 `006_update_rls_policies.sql` 已执行）

### 问题 10: 性能问题

**症状**: 页面加载慢或响应慢

**可能原因**：
- 前端资源加载慢
- 后端 API 响应慢
- 服务器资源不足

**解决方案**:
- **前端优化**：
  - 检查前端资源加载：浏览器开发者工具 Network 标签
  - 启用 Next.js 缓存（生产环境自动启用）
  - 考虑使用 CDN 加速静态资源
  - 检查 Nginx 缓存配置（静态资源缓存）
  
- **后端优化**：
  - 检查后端 API 响应时间：
    ```bash
    time curl http://localhost:3000/api/kols
    ```
  - 优化数据库查询（添加索引）
  - 查看后端服务日志：`pm2 logs kol-dashboard | grep -i slow`
  
- **服务器资源**：
  - 检查服务器资源使用：`htop` 或 `top`
  - 查看 PM2 监控：`pm2 monit`
  - 检查内存和 CPU 使用率

---

## 📞 获取帮助

如果遇到问题：

1. **查看项目文档**
   - `README.md` - 项目概述
   - `ENV_SETUP.md` - 环境变量详细说明
   - `ADMIN_SETUP.md` - 管理员设置指南
   - `RUN_COLLECTION.md` - 数据采集说明

2. **检查日志**
   - PM2 日志：`pm2 logs kol-dashboard`
   - Nginx 日志：`sudo tail -f /var/log/nginx/kol-dashboard-error.log`
   - 系统日志：`sudo journalctl -xe`

3. **检查 Supabase**
   - 查看 Supabase Dashboard 中的日志
   - 检查数据库连接状态
   - 验证 RLS 策略

4. **联系支持**
   - 查看项目 Issues（如果使用 GitHub）
   - 联系技术支持团队

---

## 🔒 安全建议

1. **环境变量安全**
   - ✅ 不要将 `.env` 文件提交到 Git
   - ✅ 使用强密码作为 `CRON_SECRET`
   - ✅ 定期轮换 API 密钥
   - ✅ 限制 `.env.production` 文件权限：`chmod 600 .env.production`

2. **防火墙配置**
   ```bash
   # 只开放必要端口
   sudo ufw allow 22/tcp    # SSH
   sudo ufw allow 80/tcp    # HTTP
   sudo ufw allow 443/tcp   # HTTPS
   sudo ufw enable
   sudo ufw status
   ```

3. **定期更新**
   ```bash
   # 更新系统
   sudo apt update && sudo apt upgrade -y
   
   # 更新 Node.js 依赖
   npm audit fix
   npm update
   ```

4. **备份数据库**
   - 在 Supabase Dashboard 中配置自动备份
   - 定期导出数据库快照
   - 保存备份到安全位置

5. **监控和告警**
   - 设置服务器资源监控
   - 配置应用健康检查
   - 设置异常告警通知

---

## 📝 快速参考

### 常用命令

```bash
# PM2 管理（前端+后端一体化服务）
pm2 start npm --name "kol-dashboard" -- start
pm2 restart kol-dashboard
pm2 stop kol-dashboard
pm2 logs kol-dashboard
pm2 status

# Nginx 管理
sudo systemctl status nginx
sudo systemctl restart nginx
sudo nginx -t

# 查看日志
pm2 logs kol-dashboard --lines 50
sudo tail -f /var/log/nginx/kol-dashboard-error.log
tail -f /var/log/kol-cron.log

# 测试前端
curl http://localhost:3000
curl https://your-domain.com

# 测试后端 API
curl http://localhost:3000/api/kols
curl -X GET "https://your-domain.com/api/cron/collect-all" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### 文件位置

- **项目目录**: `/path/to/kol-analytics-dashboard`
- **环境变量**: `.env.production`
- **Nginx 配置**: `/etc/nginx/sites-available/kol-dashboard`
- **PM2 日志**: `~/.pm2/logs/`
- **Cron 日志**: `/var/log/kol-cron.log`

---

**最后更新**: 2024年

**文档版本**: 2.0

---

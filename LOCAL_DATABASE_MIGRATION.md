# 从 Supabase 迁移到本地数据库指南

本文档详细说明如何将 KOL Analytics Dashboard 从 Supabase 云服务迁移到本地数据库。

---

## 📋 目录

1. [迁移方案选择](#1-迁移方案选择)
2. [方案一：使用 Supabase 本地开发环境（推荐）](#2-方案一使用-supabase-本地开发环境推荐)
3. [方案二：完全迁移到 PostgreSQL + 自定义认证](#3-方案二完全迁移到-postgresql--自定义认证)
4. [数据迁移步骤](#4-数据迁移步骤)
5. [代码修改说明](#5-代码修改说明)
6. [验证迁移](#6-验证迁移)
7. [常见问题](#7-常见问题)

---

## 1. 迁移方案选择

### 方案对比

| 特性 | 方案一：Supabase 本地 | 方案二：纯 PostgreSQL |
|------|---------------------|---------------------|
| **复杂度** | 低（几乎无需改代码） | 高（需要修改认证逻辑） |
| **功能完整性** | 完整（Auth + RLS + Storage） | 需要自己实现认证 |
| **迁移难度** | 简单 | 复杂 |
| **推荐度** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

### 推荐方案

**推荐使用方案一（Supabase 本地开发环境）**，因为：
- 代码几乎无需修改
- 保持 Supabase 的所有功能（认证、RLS、Storage）
- 迁移过程简单
- 可以随时切换回云版本

---

## 2. 方案一：使用 Supabase 本地开发环境（推荐）

### 前置要求

- Docker 和 Docker Compose（Supabase 本地环境需要）
- 至少 4GB 可用内存
- 至少 10GB 可用磁盘空间

### 步骤 1: 安装 Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# Linux
# 下载最新版本
wget https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.deb
sudo dpkg -i supabase_linux_amd64.deb

# 或使用 npm
npm install -g supabase

# 验证安装
supabase --version
```

### 步骤 2: 初始化 Supabase 本地项目

```bash
# 在项目根目录执行
cd /path/to/kol-analytics-dashboard

# 初始化 Supabase 本地配置
supabase init

# 这会创建 supabase/ 目录，包含：
# - config.toml (配置文件)
# - migrations/ (数据库迁移脚本)
```

### 步骤 3: 启动 Supabase 本地服务

```bash
# 启动所有服务（PostgreSQL、Auth、Storage、Realtime 等）
supabase start

# 输出示例：
# Started supabase local development setup.
#         API URL: http://localhost:54321
#     GraphQL URL: http://localhost:54321/graphql/v1
#   S3 Storage URL: http://localhost:54321/storage/v1
#         DB URL: postgresql://postgres:postgres@localhost:54322/postgres
#     Studio URL: http://localhost:54323
#   Inbucket URL: http://localhost:54324
#       anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**重要信息**：保存这些输出，特别是：
- **API URL**: `http://localhost:54321`
- **anon key**: 用于 `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role key**: 用于 `SUPABASE_SERVICE_ROLE_KEY`
- **DB URL**: 用于直接连接数据库

### 步骤 4: 执行数据库迁移

将现有的 SQL 脚本迁移到 Supabase 本地环境：

```bash
# 方式一：直接在 Studio 中执行
# 1. 打开 http://localhost:54323 (Supabase Studio)
# 2. 进入 SQL Editor
# 3. 按顺序执行 scripts/ 目录中的所有 SQL 脚本

# 方式二：使用迁移文件（推荐）
# 将 SQL 脚本复制到 migrations/ 目录
mkdir -p supabase/migrations

# 复制所有 SQL 脚本（按顺序重命名）
cp scripts/001_create_kols_table.sql supabase/migrations/20240101000001_create_kols_table.sql
cp scripts/002_create_snapshots_table.sql supabase/migrations/20240101000002_create_snapshots_table.sql
cp scripts/003_create_leaderboard_view.sql supabase/migrations/20240101000003_create_leaderboard_view.sql
# ... 依此类推

# 应用迁移
supabase db reset  # 重置并应用所有迁移
# 或
supabase migration up  # 只应用新迁移
```

### 步骤 5: 从 Supabase 云导出数据

#### 5.1 导出数据库结构

```bash
# 使用 Supabase CLI 导出结构
supabase db dump --db-url "postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres" -f supabase/migrations/exported_schema.sql
```

#### 5.2 导出数据

在 Supabase 云 Dashboard 中：

1. 进入 **Database** → **Backups**
2. 创建备份或使用 SQL Editor 导出数据：

```sql
-- 导出所有表数据（在 Supabase 云 SQL Editor 中执行）
COPY (SELECT * FROM public.kols) TO STDOUT WITH CSV HEADER;
COPY (SELECT * FROM public.snapshots) TO STDOUT WITH CSV HEADER;
COPY (SELECT * FROM public.profiles) TO STDOUT WITH CSV HEADER;
-- ... 其他表
```

或使用 `pg_dump`：

```bash
# 安装 PostgreSQL 客户端
sudo apt install postgresql-client

# 导出数据
pg_dump -h db.[PROJECT_REF].supabase.co \
  -U postgres \
  -d postgres \
  -t public.kols \
  -t public.snapshots \
  -t public.profiles \
  --data-only \
  -F c \
  -f data_backup.dump
```

### 步骤 6: 导入数据到本地数据库

```bash
# 使用 psql 导入
psql -h localhost -p 54322 -U postgres -d postgres -f data_backup.sql

# 或使用 pg_restore（如果是 .dump 格式）
pg_restore -h localhost -p 54322 -U postgres -d postgres data_backup.dump
```

### 步骤 7: 更新环境变量

创建或更新 `.env.local` 文件：

```env
# Supabase 本地配置
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # 从 supabase start 输出获取
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # 从 supabase start 输出获取

# 其他配置保持不变
TWITTER_API_KEY=your_twitter_api_key_here
CRON_SECRET=your_cron_secret_here
ENABLE_AUTO_COLLECTION=true
```

### 步骤 8: 测试本地环境

```bash
# 重启开发服务器
npm run dev

# 访问应用
# http://localhost:3000

# 访问 Supabase Studio
# http://localhost:54323
```

---

## 3. 方案二：完全迁移到 PostgreSQL + 自定义认证

### 前置要求

- PostgreSQL 14+ 已安装
- 需要修改代码以支持自定义认证

### 步骤 1: 安装 PostgreSQL

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# 启动 PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 创建数据库和用户
sudo -u postgres psql

# 在 PostgreSQL 命令行中执行：
CREATE DATABASE kol_analytics;
CREATE USER kol_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE kol_analytics TO kol_user;
\q
```

### 步骤 2: 执行数据库迁移

```bash
# 连接到数据库
psql -h localhost -U kol_user -d kol_analytics

# 或使用 postgres 用户
sudo -u postgres psql -d kol_analytics

# 按顺序执行所有 SQL 脚本
\i scripts/001_create_kols_table.sql
\i scripts/002_create_snapshots_table.sql
# ... 依此类推
```

**注意**：需要修改 SQL 脚本，移除 Supabase 特定的功能：
- 移除 `auth.users` 引用（需要创建自己的用户表）
- 修改 RLS 策略（使用自定义认证函数）
- 移除 Supabase 特定的扩展

### 步骤 3: 创建自定义认证系统

需要实现：

1. **用户表**（替代 `auth.users`）：

```sql
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

2. **认证中间件**（替代 Supabase Auth）

3. **修改代码**以使用自定义认证

### 步骤 4: 修改代码

需要修改以下文件：

1. **创建数据库连接文件**（替代 Supabase 客户端）：

```typescript
// lib/db/client.ts
import { Pool } from 'pg'

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'kol_analytics',
  user: process.env.DB_USER || 'kol_user',
  password: process.env.DB_PASSWORD,
})

export { pool }
```

2. **修改所有使用 Supabase 的文件**：
   - `lib/supabase/client.ts`
   - `lib/supabase/server.ts`
   - `lib/supabase/admin.ts`
   - 所有 API 路由文件

3. **实现自定义认证逻辑**

### 步骤 5: 更新环境变量

```env
# PostgreSQL 配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=kol_analytics
DB_USER=kol_user
DB_PASSWORD=your_secure_password

# 其他配置
TWITTER_API_KEY=your_twitter_api_key_here
CRON_SECRET=your_cron_secret_here
ENABLE_AUTO_COLLECTION=true
```

**注意**：此方案需要大量代码修改，不推荐除非有特殊需求。

---

## 4. 数据迁移步骤

### 从 Supabase 云导出数据

#### 方法一：使用 Supabase Dashboard

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择项目
3. 进入 **Database** → **Tables**
4. 对每个表，点击 **...** → **Export** → **CSV**

#### 方法二：使用 pg_dump（推荐）

```bash
# 安装 PostgreSQL 客户端
sudo apt install postgresql-client

# 获取数据库连接信息
# 在 Supabase Dashboard → Settings → Database → Connection string

# 导出所有数据
pg_dump -h db.[PROJECT_REF].supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  --data-only \
  --column-inserts \
  -f supabase_data_export.sql

# 或导出特定表
pg_dump -h db.[PROJECT_REF].supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  -t public.kols \
  -t public.snapshots \
  -t public.profiles \
  --data-only \
  --column-inserts \
  -f specific_tables_export.sql
```

#### 方法三：使用 Supabase CLI

```bash
# 链接到云项目
supabase link --project-ref [PROJECT_REF]

# 导出数据
supabase db dump --data-only -f data_export.sql
```

### 导入数据到本地

#### 如果使用 Supabase 本地环境

```bash
# 使用 psql
psql -h localhost -p 54322 -U postgres -d postgres -f supabase_data_export.sql

# 或使用 Supabase CLI
supabase db reset  # 如果数据已包含在迁移中
```

#### 如果使用纯 PostgreSQL

```bash
# 使用 psql
psql -h localhost -U kol_user -d kol_analytics -f supabase_data_export.sql
```

### 验证数据迁移

```sql
-- 在数据库中执行
SELECT COUNT(*) FROM public.kols;
SELECT COUNT(*) FROM public.snapshots;
SELECT COUNT(*) FROM public.profiles;
SELECT COUNT(*) FROM auth.users;  -- 如果使用 Supabase 本地
```

---

## 5. 代码修改说明

### 方案一（Supabase 本地）：几乎无需修改

如果使用 Supabase 本地环境，代码几乎不需要修改，只需要：

1. **更新环境变量**（已在步骤 7 完成）
2. **确保 URL 正确**：使用 `http://localhost:54321` 而不是云 URL

### 方案二（纯 PostgreSQL）：需要大量修改

需要修改的文件和内容：

1. **安装 PostgreSQL 客户端**：

```bash
npm install pg
npm install --save-dev @types/pg
```

2. **创建数据库连接**：

```typescript
// lib/db/connection.ts
import { Pool } from 'pg'

export const db = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
})
```

3. **修改所有 API 路由**：

```typescript
// 原来的 Supabase 代码
import { createAdminClient } from '@/lib/supabase/admin'
const supabase = createAdminClient()
const { data } = await supabase.from('kols').select('*')

// 改为 PostgreSQL
import { db } from '@/lib/db/connection'
const result = await db.query('SELECT * FROM kols')
const data = result.rows
```

4. **实现认证系统**（替代 Supabase Auth）

5. **修改 RLS 策略**（使用自定义权限检查）

---

## 6. 验证迁移

### 检查清单

- [ ] 数据库连接正常
- [ ] 所有表已创建
- [ ] 数据已导入（如果从云迁移）
- [ ] 前端页面可以正常访问
- [ ] 后端 API 可以正常响应
- [ ] 用户认证功能正常
- [ ] 管理员功能正常
- [ ] 数据采集功能正常

### 测试命令

```bash
# 测试数据库连接
psql -h localhost -p 54322 -U postgres -d postgres -c "SELECT COUNT(*) FROM public.kols;"

# 测试应用
curl http://localhost:3000

# 测试 API
curl http://localhost:3000/api/kols

# 测试 Supabase Studio（如果使用方案一）
curl http://localhost:54323
```

---

## 7. 常见问题

### Q1: Supabase 本地服务启动失败

**解决方案**：
- 检查 Docker 是否运行：`docker ps`
- 检查端口是否被占用：`sudo lsof -i :54321`
- 查看日志：`supabase logs`
- 重启服务：`supabase stop && supabase start`

### Q2: 数据导入失败

**解决方案**：
- 检查 SQL 文件格式
- 确认表已创建
- 检查外键约束
- 查看 PostgreSQL 日志：`sudo tail -f /var/log/postgresql/postgresql-*.log`

### Q3: 认证功能不工作

**解决方案**：
- 检查环境变量是否正确
- 确认 Supabase Auth 服务运行（方案一）
- 检查用户表数据
- 查看浏览器控制台错误

### Q4: RLS 策略不生效

**解决方案**：
- 确认 RLS 已启用：`ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`
- 检查策略是否正确创建
- 验证用户角色和权限

### Q5: 如何切换回 Supabase 云

**解决方案**：
只需要更新环境变量：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_cloud_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_cloud_service_role_key
```

重启应用即可。

---

## 📝 总结

### 推荐方案

**强烈推荐使用方案一（Supabase 本地开发环境）**，因为：
- ✅ 代码几乎无需修改
- ✅ 保持所有 Supabase 功能
- ✅ 迁移过程简单
- ✅ 可以轻松切换回云版本

### 迁移步骤总结

1. 安装 Supabase CLI
2. 初始化本地项目
3. 启动本地服务
4. 执行数据库迁移
5. 导出云数据
6. 导入本地数据
7. 更新环境变量
8. 测试验证

---

**最后更新**: 2024年



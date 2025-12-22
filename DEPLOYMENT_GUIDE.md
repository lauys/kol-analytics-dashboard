# 服务器部署准备指南

本文档详细说明将 KOL Analytics Dashboard 部署到服务器上需要准备的所有内容。

## 📋 部署前检查清单

### 1. 服务器环境要求

#### 基础要求
- **Node.js**: 版本 18.x 或更高（推荐 20.x LTS）
- **包管理器**: npm、yarn 或 pnpm
- **操作系统**: Linux（推荐 Ubuntu 20.04+）、macOS 或 Windows Server
- **内存**: 至少 2GB RAM（推荐 4GB+）
- **存储**: 至少 10GB 可用空间

#### 验证命令
```bash
node --version  # 应显示 v18.x 或更高
npm --version   # 应显示 9.x 或更高
```

### 2. 环境变量配置

#### 必需的环境变量

创建 `.env.production` 文件（生产环境）或直接在服务器上设置环境变量：

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

#### 获取 Supabase 凭证

1. 访问 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择你的项目（或创建新项目）
3. 进入 **Settings** → **API**
4. 复制以下值：
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`（需要点击 "Reveal" 显示）

#### 获取 Twitter API Key

1. 访问 [https://twitter.good6.top](https://twitter.good6.top)
2. 注册账号并登录
3. 在用户中心获取 API Key
4. 将 API Key 设置为 `TWITTER_API_KEY` 环境变量

#### 生成 CRON_SECRET

使用以下命令生成一个安全的随机字符串：

```bash
# Linux/macOS
openssl rand -base64 32

# 或使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. 数据库初始化

#### 执行 SQL 迁移脚本

在 Supabase Dashboard 的 **SQL Editor** 中，按顺序执行以下脚本：

```
scripts/001_create_kols_table.sql
scripts/002_create_snapshots_table.sql
scripts/003_create_leaderboard_view.sql
scripts/004_create_multi_period_views.sql
scripts/005_create_growth_rpc_functions.sql
scripts/005_create_users_table.sql
scripts/006_create_tweet_activity_stats.sql
scripts/006_update_rls_policies.sql
scripts/007_fix_kols_table.sql
scripts/008_update_leaderboard_view.sql
scripts/009_create_admin_user.sql
scripts/010_set_admin_email.sql
scripts/011_clear_mock_data.sql
scripts/012_enhance_kols_table.sql
scripts/013_add_tweet_unique_constraint.sql
scripts/014_create_api_logs_table.sql
scripts/015_add_is_hidden_to_kols.sql
```

**注意**: 请根据实际需要选择执行的脚本，某些脚本可能已经执行过或不需要。

### 4. 构建和部署

#### 方式一：使用 Vercel（推荐）

1. **连接 GitHub 仓库**
   - 将代码推送到 GitHub
   - 在 [Vercel](https://vercel.com) 导入项目

2. **配置环境变量**
   - 在 Vercel 项目设置中添加所有必需的环境变量
   - 确保 `NEXT_PUBLIC_*` 变量正确设置

3. **配置 Cron Jobs**
   - Vercel 会自动读取 `vercel.json` 中的 cron 配置
   - 确保设置了 `CRON_SECRET` 环境变量
   - Vercel 会在调用 cron 时自动添加 `Authorization: Bearer <CRON_SECRET>` 头

4. **部署**
   - Vercel 会自动构建和部署
   - 首次部署后，检查构建日志确保没有错误

#### 方式二：自托管服务器

##### 步骤 1: 克隆代码

```bash
git clone <your-repo-url>
cd kol-analytics-dashboard
```

##### 步骤 2: 安装依赖

```bash
npm install
# 或
yarn install
# 或
pnpm install
```

##### 步骤 3: 设置环境变量

```bash
# 创建 .env.production 文件
cp .env.example .env.production  # 如果有示例文件
# 或直接创建
nano .env.production
```

将上述环境变量添加到文件中。

##### 步骤 4: 构建项目

```bash
npm run build
```

##### 步骤 5: 启动生产服务器

```bash
# 使用 PM2（推荐）
npm install -g pm2
pm2 start npm --name "kol-dashboard" -- start

# 或直接启动
npm start

# 或使用 Node.js 直接运行
NODE_ENV=production node server.js
```

##### 步骤 6: 配置反向代理（Nginx）

创建 Nginx 配置文件 `/etc/nginx/sites-available/kol-dashboard`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

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
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/kol-dashboard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

##### 步骤 7: 配置 SSL（Let's Encrypt）

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

##### 步骤 8: 配置 Cron Jobs

如果使用自托管服务器，需要配置系统 cron 来调用 API：

```bash
# 编辑 crontab
crontab -e

# 添加以下行（每天凌晨 2 点执行）
0 2 * * * curl -X GET "https://your-domain.com/api/cron/collect-all" -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### 5. 部署后验证

#### 检查清单

- [ ] 应用可以正常访问
- [ ] 环境变量已正确设置
- [ ] 数据库连接正常
- [ ] 可以登录/注册账号
- [ ] 可以导入 KOL 数据
- [ ] Cron 任务可以正常执行
- [ ] API 端点响应正常

#### 测试命令

```bash
# 测试应用是否运行
curl http://localhost:3000

# 测试 API 端点（需要认证）
curl -X GET "https://your-domain.com/api/cron/collect-all" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# 检查环境变量
node -e "console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)"
```

### 6. 监控和日志

#### 使用 PM2 监控

```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs kol-dashboard

# 查看详细信息
pm2 info kol-dashboard

# 设置开机自启
pm2 startup
pm2 save
```

#### 日志位置

- **PM2 日志**: `~/.pm2/logs/`
- **Nginx 日志**: `/var/log/nginx/`
- **系统日志**: `/var/log/syslog`

### 7. 安全建议

1. **环境变量安全**
   - 不要将 `.env` 文件提交到 Git
   - 使用强密码作为 `CRON_SECRET`
   - 定期轮换 API 密钥

2. **防火墙配置**
   ```bash
   # 只开放必要端口
   sudo ufw allow 22    # SSH
   sudo ufw allow 80    # HTTP
   sudo ufw allow 443   # HTTPS
   sudo ufw enable
   ```

3. **定期更新**
   ```bash
   # 更新系统
   sudo apt update && sudo apt upgrade -y
   
   # 更新 Node.js 依赖
   npm audit fix
   ```

4. **备份数据库**
   - 在 Supabase Dashboard 中配置自动备份
   - 定期导出数据库快照

### 8. 常见问题排查

#### 问题 1: 构建失败

**解决方案**:
- 检查 Node.js 版本是否符合要求
- 清理缓存: `rm -rf .next node_modules && npm install`
- 检查环境变量是否完整

#### 问题 2: 数据库连接失败

**解决方案**:
- 验证 Supabase 环境变量是否正确
- 检查 Supabase 项目是否激活
- 确认网络可以访问 Supabase

#### 问题 3: Cron 任务不执行

**解决方案**:
- 检查 `CRON_SECRET` 是否设置
- 验证 `ENABLE_AUTO_COLLECTION=true`
- 查看 Vercel Cron 日志或服务器日志
- 手动测试 API 端点

#### 问题 4: Twitter API 调用失败

**解决方案**:
- 验证 `TWITTER_API_KEY` 是否有效
- 检查 API 配额是否用完
- 查看 API 日志了解具体错误

### 9. 性能优化

1. **启用 Next.js 缓存**
   - 生产环境会自动启用
   - 确保 `NODE_ENV=production`

2. **使用 CDN**
   - 静态资源通过 CDN 分发
   - 配置合适的缓存策略

3. **数据库优化**
   - 为常用查询字段添加索引
   - 定期清理旧数据

### 10. 回滚方案

如果部署出现问题，可以快速回滚：

```bash
# 使用 Git
git checkout <previous-commit>
npm run build
pm2 restart kol-dashboard

# 或使用 PM2
pm2 restart kol-dashboard --update-env
```

## 📞 获取帮助

如果遇到问题：

1. 查看项目文档: `README.md`, `ENV_SETUP.md`
2. 检查 Supabase 日志
3. 查看应用日志
4. 联系技术支持

---

**最后更新**: 2024年







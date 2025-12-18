# 管理员登录指南

## 方法一：通过 UI 创建管理员账号（推荐）

1. **访问管理员设置页面**
   - 打开浏览器访问：`/admin/setup`
   - 例如：`http://localhost:3000/admin/setup`

2. **创建管理员账号**
   - 输入您的邮箱地址
   - 设置密码（至少 6 个字符）
   - 点击 "Create Admin Account" 按钮

3. **登录**
   - 创建成功后，系统会自动跳转到登录页面
   - 使用刚才创建的邮箱和密码登录
   - 登录后即可访问所有管理功能

## 方法二：通过数据库手动设置

如果您已经注册了普通账号，想升级为管理员：

1. **注册账号**
   - 访问 `/auth/sign-up` 注册一个账号

2. **运行 SQL 脚本**
   - 打开 `scripts/009_create_admin_user.sql`
   - 将脚本中的 `your-admin-email@example.com` 替换为您的邮箱
   - 在 Supabase SQL 编辑器中运行该脚本
   - 或者使用 v0 的脚本执行功能运行

3. **登录**
   - 访问 `/auth/login`
   - 使用您的邮箱和密码登录

## 管理员权限

管理员登录后可以：
- 导入新的 KOL 账号
- 标记/取消标记僵尸账号
- 查看所有 KOL 的详细数据
- 手动触发数据采集

普通用户只能：
- 查看 KOL 排行榜
- 查看各项统计数据
- 查看 KOL 详细信息（只读）

## 环境变量配置

确保以下 Supabase 环境变量已配置：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (用于管理员操作)

Twitter API 配置：
- `TWITTER_API_KEY` (用于数据采集)

## 常见问题

**Q: 忘记管理员密码怎么办？**
A: 访问登录页面，点击忘记密码链接（需要先实现密码重置功能）

**Q: 可以有多个管理员吗？**
A: 可以。在 `/admin/setup` 页面创建多个管理员账号，或通过 SQL 脚本将现有用户升级为管理员

**Q: 如何取消管理员权限？**
A: 运行 SQL 查询：
```sql
UPDATE public.profiles 
SET role = 'user' 
WHERE email = 'user-email@example.com';

# Git 代理配置指南

## 当前配置
已配置代理为：`http://127.0.0.1:7890`

## 如果 7890 端口不可用，请尝试以下端口：

### 方案 1：使用 1080 端口（Shadowsocks）
```bash
git config --global http.proxy http://127.0.0.1:1080
git config --global https.proxy http://127.0.0.1:1080
```

### 方案 2：使用 10808 端口（V2Ray）
```bash
git config --global http.proxy http://127.0.0.1:10808
git config --global https.proxy http://127.0.0.1:10808
```

### 方案 3：使用 8080 端口
```bash
git config --global http.proxy http://127.0.0.1:8080
git config --global https.proxy http://127.0.0.1:8080
```

### 方案 4：使用 SOCKS5 代理（如果是 SOCKS5）
```bash
git config --global http.proxy socks5://127.0.0.1:1080
git config --global https.proxy socks5://127.0.0.1:1080
```

## 如何查找你的代理端口？

### Windows 方法：
1. **查看代理软件设置**
   - Clash: 通常默认 7890
   - Shadowsocks: 通常默认 1080
   - V2Ray: 通常默认 10808

2. **检查系统代理设置**
   - 打开"设置" > "网络和 Internet" > "代理"
   - 查看"手动代理设置"中的端口号

3. **使用 PowerShell 检查**
   ```powershell
   netsh winhttp show proxy
   ```

## 取消代理配置
如果不需要代理，可以取消：
```bash
git config --global --unset http.proxy
git config --global --unset https.proxy
```

## 仅对 GitHub 使用代理（推荐）
如果只想对 GitHub 使用代理，可以这样配置：
```bash
git config --global http.https://github.com.proxy http://127.0.0.1:7890
```

## 测试连接
配置后测试：
```bash
git pull origin main
```









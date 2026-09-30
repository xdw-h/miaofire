# 喵火前线接手开发说明

## HTTPS 运维更新（2026-09-30）

- 正式入口：<https://8.138.109.198:18080/>。证书为 Let's Encrypt 免费 IP 短期证书。
- Certbot 5.8.0 通过 Docker 运行；证书目录为 `/etc/letsencrypt/live/8.138.109.198/`，私钥不得复制到 Git。
- `miaofire-cert-renew.timer` 每 12 小时检查续期，随机延迟最多 30 分钟；启用了开机补执行。
- 续期脚本：`/usr/local/sbin/miaofire-cert-renew`，成功后检查并重载 Nginx。
- 查看状态：`systemctl status miaofire-cert-renew.timer`；查看日志：`journalctl -u miaofire-cert-renew.service`。
- 保留公网 80 端口供 HTTP-01 验证使用，验证目录为 `/www/wwwroot/miaofire/.well-known/acme-challenge/`；其他 80 端口请求跳转 HTTPS。
- 配置回滚备份：`/www/server/panel/vhost/nginx/sub2api.conf.pre-https-20260930`。恢复后须执行 `nginx -t && nginx -s reload`。
- HTTP 与 HTTPS 的浏览器存档相互隔离，旧 HTTP 存档不会自动迁移。

## Git 代码位置

- 仓库：[https://github.com/xdw-h/miaofire](https://github.com/xdw-h/miaofire)
- 默认分支：`main`
- GitHub Pages：<https://xdw-h.github.io/miaofire/>
- 本地项目目录：`outputs/miaofire`

克隆代码：

```bash
git clone https://github.com/xdw-h/miaofire.git
cd miaofire
```

## 开发环境

- Windows：PowerShell 7（`pwsh`）
- Node.js：22.13 或更高版本，建议 Node.js 24
- 游戏本体无需安装依赖，直接使用原生 ES modules
- 完整测试命令：

```bash
node --test tests/*.test.mjs
```

本地启动：

```bash
node server.mjs --port 4173
```

然后打开 <http://localhost:4173>。`localhost` 与 `127.0.0.1` 会使用不同的浏览器存档，不要混用。

## 线上环境

服务器信息（不包含任何密码或密钥）：

- 公网 IP：`8.138.109.198`
- 系统：Alibaba Cloud Linux 3（OpenAnolis）
- Web：Nginx
- 后端：Node.js + Express
- 数据库：MySQL
- 游戏端口：`18080/tcp`
- 页面地址：<http://8.138.109.198:18080/>
- 健康检查：<http://8.138.109.198:18080/api/leaderboard/health>

服务器目录：

```text
/www/wwwroot/miaofire/                 # 静态前端
/www/wwwroot/forfree_server/           # Node.js 服务与排行榜接口
/www/wwwroot/forfree_server/src/leaderboard.js
/www/server/panel/vhost/nginx/sub2api.conf
```

排行榜接口：

```text
GET  /api/leaderboard/health
GET  /api/leaderboard/leaderboard
POST /api/leaderboard/scores
GET  /api/leaderboard/endless-leaderboard
POST /api/leaderboard/endless-scores
```

数据库表：`miaofire_scores`、`miaofire_endless_scores`。数据库账号、密码和其他环境变量只保存在服务器的 `.env`，禁止提交到 Git。

## 发布流程

1. 在本地修改并运行测试。
2. 将 `outputs/miaofire` 中的前端文件同步到服务器 `/www/wwwroot/miaofire/`。
3. 修改服务器文件后检查并重载 Nginx：

   ```bash
   nginx -t && nginx -s reload
   ```

4. 修改 Node 服务后重启 `forfree_server`，再访问健康检查地址。
5. 提交中文 Git 说明并推送 `main`；GitHub Pages 会自动更新。

## 安全注意事项

- 本文档不保存服务器密码、MySQL 密码、API Token 或 SSH 私钥。
- 服务器密码曾在聊天中使用过，交接后应立即重置并改用 SSH 密钥。
- 不要把 `.env`、数据库文件、测试凭据或个人账号信息提交到仓库。

# 喵火前线接手开发说明

## 账号与云存档更新（1.14.0）

账号、云存档和游客绑定已上线。完整开发、API、备份和回滚说明见 [backend/accounts/README.md](backend/accounts/README.md)。账号数据库为 `/var/lib/miaofire-accounts/accounts.sqlite`，独立于原 MySQL 排行榜；服务为 `miaofire-accounts.service`，仅监听回环 4186。前端入口为 `src/account-ui.mjs`，存储隔离逻辑为 `src/account-client.mjs`。

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
- GitHub Pages（仅静态试玩）：<https://xdw-h.github.io/miaofire/>
- 原机器项目目录：`C:\Users\Administrator\Documents\Codex\2026-09-29\https-mp-weixin-qq-com-s\outputs\miaofire`；新机器克隆后的 `miaofire` 就是仓库根目录，不需要再进入 `outputs/miaofire`。

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

联调账号时，按 [账号服务本地开发步骤](backend/accounts/README.md#本地开发) 启动两个终端：账号服务监听 4191，前端监听 4190 并代理账号请求。使用独立的 `account-dev.sqlite` 测试库，不复制生产账号数据库。新机器无需复制旧机器的 Node 或 Codex 缓存路径，安装上述 Node 版本即可。

## 线上环境

服务器信息（不包含任何密码或密钥）：

- 公网 IP：`8.138.109.198`；阿里云广州轻量应用服务器，系统 Alibaba Cloud Linux 3（OpenAnolis）。
- Web：Nginx；游戏 HTTPS 端口 `18080/tcp`，80 保留证书验证并跳转 HTTPS。
- 排行榜：Node.js + Express + MySQL；账号与云存档：独立 Node.js 服务 + SQLite。
- 页面地址：<https://8.138.109.198:18080/>。
- 健康检查：[排行榜](https://8.138.109.198:18080/api/leaderboard/health)、[账号服务](https://8.138.109.198:18080/api/account/health)。

服务器目录：

```text
/www/wwwroot/miaofire/                 # 静态前端
/www/wwwroot/forfree_server/           # Node.js 服务与排行榜接口
/www/wwwroot/forfree_server/src/leaderboard.js
/www/server/panel/vhost/nginx/sub2api.conf
/opt/miaofire-accounts/current/        # 账号服务当前版本
/opt/miaofire-node/bin/node            # 账号服务独立 Node 运行时
/var/lib/miaofire-accounts/accounts.sqlite
/var/lib/miaofire-accounts/backups/    # 账号每日备份（同机保留 14 天）
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

1. 在仓库根目录修改并运行 `node --test tests/*.test.mjs`，检查提交中没有密码、密钥、数据库或备份。
2. 按 [账号服务发布与回滚](backend/accounts/README.md#发布与回滚) 打包并部署前端和账号服务；先保留线上备份。纯静态更新只需发布前端文件，不上传本地测试数据。
3. 账号代码更新后确认 `miaofire-accounts.service` 正常；只有修改旧排行榜服务时才处理 `forfree_server`。只有修改 Nginx 配置时才执行 `nginx -t && nginx -s reload`。
4. 访问上述两个 HTTPS 健康检查，并验证游戏加载、账号登录及云存档恢复。
5. 使用中文提交说明推送 `main`。GitHub Pages 会自动更新，但 Git 推送不会自动部署自有服务器。

## 安全注意事项

- 本文档不保存服务器密码、MySQL 密码、API Token 或 SSH 私钥。
- 服务器密码曾在聊天中使用过，交接后应立即重置并改用 SSH 密钥。
- 不要把 `.env`、数据库文件、测试凭据或个人账号信息提交到仓库。

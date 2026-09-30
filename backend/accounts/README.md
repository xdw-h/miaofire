# 账号与云存档服务

## 使用方法

在 HTTPS 游戏顶部选择“账号 / 云存档”。注册用户名（3–24 位英文、数字、下划线）及密码（10–128 字符），保存仅展示一次的恢复码，然后选择绑定当前游客进度。已有账号登录后选择云端或本机进度，替换前需要二次确认。退出账号恢复本浏览器原游客空间。

登录并选定存档后每 30 秒同步一次，也可以点击“立即保存到云端”。关页面之前建议确认显示“云端已保存”；最后一次同步后的进度仍保存在当前浏览器。服务端版本冲突时停止自动上传，需重新读取后选择。账号系统不自动迁移不同 HTTP/HTTPS 来源的历史存档。

## 本地开发

Node.js >=22.13，建议 24。账号服务使用内置 SQLite，无需安装 npm 依赖；SQLite 与原 MySQL 排行榜分离。

终端一（PowerShell 7）：

```powershell
$env:DEV_HTTP='1'
$env:ALLOWED_ORIGINS='http://localhost:4190'
$env:ACCOUNT_DB='account-dev.sqlite'
$env:PORT='4191'
node backend/accounts/service.mjs
```

终端二：

```powershell
node server.mjs --port 4190 --account-port 4191
```

打开 `http://localhost:4190`。不要在生产设置 `DEV_HTTP=1`。运行测试：`node --test tests/*.test.mjs`。安装 Playwright 后可运行 `node tests/account-browser-check.mjs`，该检查会创建随机测试账号，仅对可丢弃本地数据库运行；生产验收需显式设置 ACCOUNT_TEST_URL 并清理生成账号。

## 生产环境

- 代码：`/opt/miaofire-accounts/current/`，版本目录 `/opt/miaofire-accounts/releases/`。
- Node：`/opt/miaofire-node/bin/node`，部署时从服务器现有 v22.23.2 拷贝，无需改变系统 Node。
- 数据库：`/var/lib/miaofire-accounts/accounts.sqlite`，包含 users、sessions、saves、save_backups；密码为 scrypt 哈希，恢复码和登录会话只存摘要。
- 监听：`127.0.0.1:4186`，Nginx 将 `/api/account/` 转发至此。无需开放公网 4186。
- 运行：`miaofire-accounts.service`，专用用户 `miaofire-accounts`，开机自动启动。查看日志：`journalctl -u miaofire-accounts.service`。

## HTTP 接口

所有响应 no-store；写请求需要允许的 Origin 和 JSON。认证使用 Secure、HttpOnly、SameSite=Strict Cookie，有效期 30 天。

| 路径（前缀 /api/account） | 方法 | 请求/用途 |
|---|---|---|
| /register | POST | username、password；返回 user 和一次性 recoveryCode |
| /login | POST | username、password；返回 user |
| /recover | POST | username、recoveryCode、password；撤销会话、返回新恢复码 |
| /me | GET | 当前 user 或 null |
| /logout | POST | 退出当前会话 |
| /save | GET | save、revision、updatedAt |
| /save | POST | save（合法 v6）、revision；成功返回新 revision；版本冲突 409 |
| /health | GET | 服务可用性 |

存档请求携带 X-Account-ID 防止同浏览器其他页面切换会话导致串号。账号返回稳定 honorToken 仅用于兼容原休闲排行榜，不是登录凭据。排行榜仍由原 MySQL 服务存储，不能把客户端战绩视为防作弊结果。

## 发布与回滚

打包：`tar -czf miaofire-accounts-release.tar.gz index.html favicon.svg src backend/accounts`。上传压缩包后，从中提取 `backend/accounts/deploy.sh`，执行 `bash deploy.sh /tmp/miaofire-accounts-release.tar.gz`。脚本先备份现有前端和 Nginx，启动独立账号服务，通过健康检查再切换静态文件和路由。

回滚文件在 `/var/backups/miaofire/`，按发布时刻保存。恢复对应前端 tar 和 Nginx 备份后执行 `nginx -t && nginx -s reload`；不要删除账号数据库。如需回滚账号代码，将 current 指向上一 release，重启账号服务。

每日备份由 `miaofire-account-backup.timer` 触发，`VACUUM INTO` 产生一致性备份，保存最近 14 天，路径 `/var/lib/miaofire-accounts/backups/`。查看 `systemctl status miaofire-account-backup.timer` 和 `journalctl -u miaofire-account-backup.service`。这是同机备份，服务器磁盘损坏仍会丢失，应定期将加密备份保存在异地。恢复数据库前停服务，保留原库和 WAL/SHM 文件备份，使用选定备份恢复，再检查属主并启动服务。

禁止提交 `.env`、证书私钥、账号数据库、备份、真实密码和恢复码到 Git。

# 荣誉榜服务部署

状态：代码及本地共享服务已实现，生产服务需要项目所有者的 Cloudflare 账号。GitHub Pages 只托管游戏页面，不能作为多人战绩数据库。不要在前端放管理令牌或数据库密钥。

## 部署顺序

在项目根目录执行，使用 Node.js 24 和官方 Wrangler CLI。以下命令使用 PowerShell 7，依次执行；先由账号所有者完成 Cloudflare 登录和必要授权。

1. 使用 `npx wrangler login` 完成账号授权，然后 `npx wrangler d1 create miaofire-honor` 创建数据库。将返回的 database_id 写入 `backend/honor/wrangler.jsonc` 的同名字段；保留绑定名称 `DB`。创建前可先 `npx wrangler d1 list` 检查同名资源，避免重复创建。
2. 执行 `npx wrangler d1 execute miaofire-honor --remote --file backend/honor/schema.sql --config backend/honor/wrangler.jsonc` 建表。此 schema 使用 IF NOT EXISTS，不会清空已有记录。
3. 执行 `npx wrangler secret put RATE_LIMIT_SALT --config backend/honor/wrangler.jsonc`，通过交互输入至少 32 字符的随机值。保存在 Cloudflare Secret，不能写入 Git。执行 `npx wrangler deploy --config backend/honor/wrangler.jsonc` 发布服务。
4. 访问发布地址的 `/health` 确认 `{ok:true}`，然后将公开 HTTPS 服务根地址填入 `src/leaderboard-config.mjs` 的 `LEADERBOARD_API`。`ALLOWED_ORIGINS` 使用页面的 origin：`https://xdw-h.github.io`，不包含 `/miaofire/` 路径。
5. 运行 `node --test tests/*.test.mjs`，用生产服务测试两个独立浏览器的提交和刷新。确认通过后提交并推送 `main` 发布 GitHub Pages，手机复验昵称提交、个人名次、关闭榜单继续战斗。

首次 Wrangler 部署可能要求选择 workers.dev 子域名，由账号所有者确认。免费方案额度不足时不要自动升级付费计划。未配置数据库、Secret 或 URL 时不要宣称荣誉榜已上线。

## 本地联调

执行 `node backend/honor/dev-server.mjs` 启动端口 4181 的 SQLite 服务，再 `node server.mjs --port 4182` 启动页面。仅在临时预览副本中设置 `LEADERBOARD_API='http://localhost:4181'`。分别打开 `http://localhost:4182` 和 `http://127.0.0.1:4182` 模拟两个独立身份；它们访问同一个 API。数据库 `dev.sqlite` 已忽略，不得发布。正式配置中不得加入这些开发 origin。

## 接口和数据

- `GET /leaderboard`：前 100 名；携带 `Authorization: Bearer <64位hex随机令牌>` 时额外返回自己的排名，即使不在前 100 名。
- `POST /scores`：同一令牌加 JSON `{nickname,stage,waves}`；要求来自允许的 Origin，正文最多 2048 字节。仅更好成绩替换原分数；改名不改变同分先后顺序。
- 身份：浏览器产生 256 位随机令牌，本地保存；数据库只存令牌的 SHA-256 哈希。榜单公开 UUID，不公开身份令牌或哈希。
- 提交限制：同一网络 IP 每小时最多 30 次有效提交；数据库只存加盐哈希，旧限流记录定期清理。公共网络上的玩家共用此额度。
- 维护：昵称不代表真实身份；恶意成绩或不当昵称可由管理员在 D1 控制台按公开 UUID 定位处理。删除记录属于管理员操作，需明确确认。自动反作弊、敏感词审核、账号申诉未纳入此版。

## 验证与回退

接口测试使用真实 SQLite，覆盖跨玩家共享、最佳分保留、并发提交、身份隔离、排序、前 100 名与榜外个人名次、昵称验证、限流、正文大小、故障响应。客户端覆盖身份持久化、网络/存储故障、未提交最佳波次和本地时间格式。

回退页面不会删除 D1 战绩；需要暂停新增上榜时可先移除前端 API 配置并重新发布。旧客户端仍可能直连原服务，需要彻底停止写入时应在服务端处理，不能只依赖隐藏入口。

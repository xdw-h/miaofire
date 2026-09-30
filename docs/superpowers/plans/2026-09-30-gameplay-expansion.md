# 五项玩法实施计划

> **For agentic workers:** 使用 subagent-driven-development 执行有明确文件边界的任务，独立验收后进入下一玩法。

**Goal:** 按既定顺序添加并上线五项玩法，兼容已有进度和主线排行榜。

**Architecture:** 复用固定步长战斗，将带 run 的挑战统一委派到独立游戏状态。持久字段逐项添加并通过默认值、校验、旧档备份迁移；排行榜用独立 D1 表保留原 API 兼容性。

**Tech Stack:** 原生 JavaScript ES modules、Canvas、Node 24 node:test、Cloudflare Worker/D1、GitHub Pages。

## Task 1：无尽守卫

- [ ] 战斗引擎：新增 `src/endless.mjs`，修改 `src/game.mjs`、`src/enemies.mjs`、`src/survival.mjs`、`src/enemy-attack-art.mjs`；新增 `tests/endless.test.mjs`。首先断言 `startEndless(createGame()).ok === false`，通关 5 关后成功，富裕与初始存档得到相同试用属性；完成 5 波进入选择，选择后继续，普通换波不恢复血盾，退出保留主线。
- [ ] 合约：`s.endless={bestWaves:0}` 持久化；`s.challenge={kind:'endless',run,status}`，`run.endlessRun={waves:0,pending:false}`。从 game 导出 `startEndless(s)`、`chooseEndless(s,id)`，选项 id 为 `power/tempo/repair`；每波事件 `endless-wave`，选择事件 `endless-choice`，结束事件 `challenge-result`；目标 id 为 `endless-N`。`exitChallenge` 保留最高波数，最高值也在每波完成时即时更新。60 秒一波，Boss 后三选一，主线完全冻结。
- [ ] 服务：新增 `endless_scores` 表，增加 `GET /endless-leaderboard` 和 `POST /endless-scores`，载荷 `{nickname,waves}`；同现有 token 身份、昵称校验与限流，波数限制 1..99999，只保存最高波。同分按 achieved_at/id 排序，返回 `{entries,mine}`，单项 `{id,nickname,waves,rank,achievedAt}`。新增真实 SQLite API 测试覆盖两身份、排序、防降分、主线隔离。
- [ ] 界面与存档：修改 `src/app.mjs`、`src/scene.mjs`、`src/storage.mjs`，新增 `src/endless-ui.mjs`、`src/endless-board.mjs`、`src/endless.css`。version 5 迁移备份原 v4 原文，再填入 endless 默认值；高分和转生不丢失，刷新退出战局。挑战页显示解锁/开始/最佳波；三选一可重开；独立排行榜入口和结算提交入口。
- [ ] 验证并交付：用 Node 24 执行 `--test tests/*.test.mjs`，浏览器测试解锁、首 Boss、三选一、失败/退出、两种榜单切换和 390px 宽度；部署 D1 增量表与 Worker，版本更新、中文提交、推送 Pages，核实线上版本及服务。

## Task 2：武器改造（Task 1 完整后执行）

- [ ] 新建 `src/modifications.mjs`、`tests/modifications.test.mjs`，定义配件购买/切换/升级与资源校验；测试关卡门槛、挑战锁定、扣费一次、保留已解锁配件。
- [ ] 将穿透、弹射、灼伤接入 `src/game.mjs` 和 `src/combat-effects.mjs`，相应实际命中事件供 `src/scene.mjs` 绘制，测试护甲、下一目标、持续伤害与击杀一致性。
- [ ] 在 `src/arsenal-ui.mjs` 与 app 接入改造界面，存档校验保留改造数据；明确合成时返还规则，验证移动端与旧档。

## Task 3：Boss 悬赏（Task 2 完整后执行）

- [ ] 新建 `src/bounties.mjs`、`tests/bounties.test.mjs`，定义三个 Boss 与独立状态，接入 game/enemies/survival，测试周期护盾、毒伤与狂暴重击。
- [ ] 挑战页提供三项悬赏、奖励展示、失败/退出结算，胜利发改造材料，测试重复结算无奖励、主线冻结及保存。

## Task 4：伙伴进化（Task 3 完整后执行）

- [ ] 新建 `src/evolutions.mjs`、`tests/evolutions.test.mjs`，伙伴达到 10 级选择分支并保存，测试未解锁/资源不足/挑战中拒绝。
- [ ] 接入伙伴页、主动技能栏、伤害/防御与特效，测试冷却、切换伙伴、转生、独立试用隔离。

## Task 5：分岔远征（Task 4 完整后执行）

- [ ] 新建 `src/routes.mjs`、`src/routes-ui.mjs`、`tests/routes.test.mjs`，定义分岔图、节点选择、局内资源、独立战局与终点奖励。
- [ ] 测试战斗/精英/商店/宝箱/休息的实际差异，无法跳层或重复购买/领取，退出和存档规则清楚可见。
- [ ] 五项整体回归、代码审查、手机浏览器验收、更新 README/版本/发布压缩包，发布并核实线上资源与排行榜服务，逐条审计需求后完成目标。

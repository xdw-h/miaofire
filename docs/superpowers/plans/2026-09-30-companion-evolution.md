# 伙伴扩充与进化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将伙伴从三位扩展到六位，并加入 Lv.10 攻击/守护进化和两个真实战斗主动技能。

**Architecture:** 保持 `progression.mjs` 作为伙伴定义、领取、喂养和携带边界；新增 `evolutions.mjs` 管理分支和技能状态。`game.mjs` 在主线及 Boss 悬赏中读取伙伴战斗加成并处理冷却，挑战/无尽运行态继续使用固定队伍。`storage.mjs` 对新字段做兼容校验，`progression-ui.mjs` 展示伙伴卡和进化动作，`app.mjs` 负责事件和技能反馈。

**Tech Stack:** 原生 ES modules、Node 24 `node:test`、现有固定步长模拟、HTML/CSS 无第三方依赖。

---

### Task 1: Define six companions and failing rule tests

**Files:**
- Modify: `src/progression.mjs`
- Create: `src/evolutions.mjs`
- Test: `tests/evolutions.test.mjs`

- [ ] **Step 1: Write failing tests** for six IDs, unlock thresholds, level-20 cap, defense/recovery/Boss bonuses, Lv.10 branch requirements, duplicate branch rejection, and challenge rejection.
- [ ] **Step 2: Run the focused test command** `rtk proxy "C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" --test tests/evolutions.test.mjs`; confirm failure because the new IDs and evolution functions are absent.
- [ ] **Step 3: Add `stoneTurtle`, `moonRabbit`, and `starFox` to `PETS`; extend `petBonus()` with `defense`, `recovery`, and `boss` fields while preserving old fields; add `evolutions.mjs` exports `EVOLUTION_BRANCHES`, `evolutionDefaults`, `evolvePet`, `petEvolutionBonus`, `castPetSkill`, and `tickPetSkill`.
- [ ] **Step 4: Run the focused test again** and confirm six-partner rules pass, including exact costs and atomic failure behavior.
- [ ] **Step 5: Commit with Chinese message `新增六位伙伴与进化规则测试`** after the focused tests are green.

### Task 2: Persist evolution state and integrate combat

**Files:**
- Modify: `src/game.mjs`, `src/survival.mjs`, `src/storage.mjs`, `src/bounties.mjs`
- Modify: `tests/migration.test.mjs`, `tests/storage.test.mjs`, `tests/bounties.test.mjs`, `tests/survival.test.mjs`

- [ ] **Step 1: Add failing tests** for old v6 saves gaining `petEvolution` defaults, exact round-trip persistence, malformed branch rejection, turn reset retention, and challenge/normal 30/120Hz parity.
- [ ] **Step 2: Run the focused storage and combat tests** and confirm missing fields or exports fail.
- [ ] **Step 3: Add per-pet `evolution` and `skillCooldown` defaults, validate branch IDs and cooldown bounds, and keep challenge runtime out of saves; wire `petBonus()` into defense stats, recovery, Boss damage, and fixed-step skill ticking.
- [ ] **Step 4: Run focused storage, survival, bounty, and evolution tests; verify old save resources and existing three-pet behavior are unchanged.
- [ ] **Step 5: Commit with Chinese message `接入伙伴进化存档与战斗加成`**.

### Task 3: Build partner page and skill interactions

**Files:**
- Modify: `src/progression-ui.mjs`, `src/app.mjs`, `src/styles.css`
- Create: `tests/evolutions-ui.test.mjs`

- [ ] **Step 1: Write failing UI tests** for six cards, lock text, level/cost display, evolution buttons, active skill button, and safe empty/malformed state.
- [ ] **Step 2: Run the focused UI test command** `rtk proxy "C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" --test tests/evolutions-ui.test.mjs`; confirm failure before rendering changes.
- [ ] **Step 3: Render six cards with clear roles, add `进化` and `伙伴技能` actions, wire click handlers to `evolvePet` and `castPetSkill`, and add compact mobile styles with a scrollable card list.
- [ ] **Step 4: Run UI tests and node syntax checks for modified modules.
- [ ] **Step 5: Commit with Chinese message `接入伙伴进化页面与主动技能`**.

### Task 4: Regression and mobile verification

**Files:**
- Modify: `README.md`, `package.json`, `docs/superpowers/specs/2026-09-30-gameplay-expansion.md`
- Create: `伙伴进化验证记录.md`

- [ ] **Step 1: Run the full suite** with `rtk proxy "C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" --test tests/*.test.mjs`; record the exact passing count.
- [ ] **Step 2: Regenerate the local preview, seed a level-10 save, and use the browser at 390×844 to verify six cards, one evolution choice, skill cooldown text, and no horizontal overflow.
- [ ] **Step 3: Update README/version to 1.12.0 and document old-save migration and the six roles.
- [ ] **Step 4: Commit with Chinese message `发布伙伴扩充与进化版本`.
- [ ] **Step 5: Push `main`, trigger and poll GitHub Pages until the build reports `built`, refresh the live page, and update `outputs/喵火前线-网页试玩版.zip` from the release commit.

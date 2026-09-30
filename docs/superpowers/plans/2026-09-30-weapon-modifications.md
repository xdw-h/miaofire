# 武器改造实施计划

> **For agentic workers:** 使用 subagent-driven-development，战斗/规则、存档、界面分别按文件边界实施，先观察行为测试失败再实现。

**Goal:** 在第 8 关解锁有实际战斗效果和特效的三种可切换武器配件，完整保存养成与退还投入。

**Architecture:** 配件属于具体武器，每把可购买三种、同时启用一种。战斗伤害通过统一的伤害与击杀结算路径处理直接命中、灼伤和下一敌人的弹射，避免漏发/重复奖励；独立试用武器不继承改造。

**Tech Stack:** ES modules、Canvas、Node 24 node:test、version 6 本地存档。

## 规则合约

`s.workshop={parts:0}` 保存悬赏材料。`weapon.mods={pierce:1,ricochet:2,burn:0}` 为已买配件等级，未出现的 key 按 0；整个 mods 字段可缺省。`weapon.activeMod` 为三个 id 之一或 null，缺省为 null。等级 1..3。

`src/modifications.mjs` 导出 `MODIFICATIONS`（id/name/desc/color）、`buyModification(s,weaponId,id)`、`equipModification(s,weaponId,idOrNull)`、`upgradeModification(s,weaponId,id)`、`dismantleModifications(s,weaponId)`、`modificationLevel(weapon)`、`hasModifications(weapon)`。

每种配件首次解锁花费 20 钻石并自动装配；切换免费。一级升二级消耗 8 份材料，二级升三级消耗 16 份。第 10 关 Boss 悬赏提供材料（按顺序在下一功能接入）。拆除该武器所有配件，全额退回购买钻石及升级材料，不退还战斗收益。改造操作均要求 bestEver>=8、无挑战、合法武器和足够资源，失败不可部分扣费。已改造武器拒绝合成，提示先拆除返还投入。

穿透：无视目标 50% / 75% / 100% 护甲；穿甲弩原本无视护甲，不额外重复叠加。

弹射：每发预留原始单发伤害的 25% / 35% / 45% 给下一敌人；当前敌人死亡后，预留量一次作用到下一目标（计算下一目标护甲/护盾），超过其生命的部分不继续传递。每名敌人的预留量在切换时清空，训练木偶没有下一敌人，不预留。可跨主线关卡，但待选祝福期间不提前结算。

燃烧：命中添加灼伤，持续 3 秒，每 0.5 秒结算一次；每次伤害为该发原始单发的 8% / 12% / 16%（四舍五入至少 1），计算目标护甲和护盾。最多三个独立灼伤，新效果替换最早的一层。目标死亡清空灼伤。持续伤害能够完成击杀、关卡、挑战，走相同奖励路径且不会额外开枪。

事件约定：射击事件携带 `mod`，值为当前配件 id 或 null。`burn-tick` / `ricochet-hit` 带 `{damage,targetId,targetLevel,targetEnemy}`，再附加与普通命中一致的 kill/level/result 事件。支持低动态效果；弹射不绘制成对当前敌人的第二次直线命中。

## 实施与验收

- [ ] 规则与引擎：新增 `src/modifications.mjs`、`tests/modifications.test.mjs`；修改 `src/game.mjs`、`src/combat-effects.mjs`，必要时 `src/weapons.mjs`。先测试 8 关门槛、扣费一次、免费切换、升级费用、拆除退款、禁止直接合成，观察失败后实现；实际战斗验证三种效果、持续伤害致死奖励、跨目标隔离、30/120Hz一致性、每日/无尽试用隔离。
- [ ] 存档：`src/storage.mjs` 与 `tests/modifications-storage.test.mjs`；version6 备份 v5 原文再增加 workshop，旧档删除未知 mods/activeMod 字段，不制造已购配件。v6 校验 parts 整数0..1e9、mods 三种已知key且等级0..3、activeMod必须已购买；转生、刷新保留。更新旧迁移测试的目标版本期待。
- [ ] 界面：新增 `src/modifications-ui.mjs`，在 `src/app.mjs` 的武器卡片接入「改造」和当前配件；弹窗展示三配件等级、特性、购买/切换/升级与拆除退款，材料不足原因可见，手机可操作。修改 `src/scene.mjs` 和 `src/weapon-art.mjs` 绘制穿透弹、弹射轨迹、灼伤跳字及火焰。
- [ ] 回归与交付：执行 Node24 `--test tests/*.test.mjs`，真实浏览器本地测试第8关存档改造购买/切换/战斗/拆除、390px布局、刷新；独立规格和质量审查。更新版本1.10.0、README、验证记录、压缩包；发布并核实线上入口及版本。

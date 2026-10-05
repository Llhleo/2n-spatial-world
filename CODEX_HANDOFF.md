# Codex 接续入口

从 `experiment/lookback-v2` 最新提交继续。保留已完成的高清模型、花朵、五区域、字体和人物数据，不重做。

1. 当前运行时是 Sites v49，先读 [独立结尾发布记录](docs/2026-10-05-guild-closure-v49.md)。新增 `guild-closure.js`（可逆采样）、`guild-closure-view.js`（共享几何/独立材质），旧进度结束后追加 3 单位/12 秒，不能重播首页动画。

2. 先读 [Pages 当前发布](docs/2026-10-05-pages-release.md)、[仓库维护规则](docs/REPOSITORY_GUIDE.md) 和 [公会故事提案](docs/2026-10-05-guild-story-proposal.md)。故事尚未实现；确认设计后才写实现计划。当前运行时入口：[v45 长链恢复](docs/2026-10-05-v45-chain-restore.md)。用户明确否决 v47 固定两排设计，`src/petal-chain.js` 不再用于人物展示。当前花瓣在 `people-courtyard.js` 预先布置世界锚点，`companionship.js` 绘制附近实例；不再按最近排名抢占位置，不把全链逐帧缩小。此前入口：[白字与固定花瓣链润色](docs/2026-10-05-people-polish.md)。此前入口：[加载与人物稳定性修复](docs/2026-10-04-loading-people-stability.md)。先读取 [PROJECT_STATUS.md](PROJECT_STATUS.md) 和 [本轮修正记录](docs/2026-10-04-people-refinement.md)，核对 Sites 当前版本和 GitHub 最新提交。
3. 人物文字只编辑 `content/people.json`，规则见 `content/README.md`。
4. 主要实现：`src/people-courtyard.js`（五区镜头/分组/窗口）、`people-layout.js`（真实字形布局）、`people-distance.js`（手动阅读预算）、`people-story.js`（时间与滑动）、`petal-breath.js`（微浮动）。
5. 用户在 2026-10-05 已授权当前版发布到 Pages，main 发布源码为 `e65616c7ac91d7a381eed03d959baf4c65e77c94`。旧的“Pages 花朵冻结版”约束是历史记录，已被本次明确授权覆盖；未来视觉开发仍先走开发分支和原 Sites 项目，不能未经当轮授权再次覆盖 Pages。原旅程尤其 Garden 保持锁定，旧 Llhleo/2n 不改。
6. 使用针对性检查、一次必要构建；避免重复完整测试和多轮代理审阅。遇到阻塞先保存 GitHub checkpoint，切换可用方式。
7. 实机视觉验收仍需用户反馈；不要把数学检查当作 Safari 视觉验收。

此前接续记录保留在 [历史交接](docs/archive/2026-10-04-CODEX_HANDOFF.md)。

上一发布快照：Sites v48，源码 `d334e77bdf31aadf1766439e5ac3fc2d0c530a37`，GitHub 代码 checkpoint `b20253a4e80e83221d84a6884a08fa1126107f78`。已恢复 v45 长链的尺度/前后空间布局，并保留 v47 的加载和白字改进。先等 iPhone Safari 验收，不把数学检查称作实机视觉通过。

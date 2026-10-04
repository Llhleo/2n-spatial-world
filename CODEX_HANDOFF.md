# Codex 接续入口

从 `experiment/lookback-v2` 最新提交继续。保留已完成的高清模型、花朵、五区域、字体和人物数据，不重做。

1. 当前新增入口：[加载与人物稳定性修复](docs/2026-10-04-loading-people-stability.md)。先读取 [PROJECT_STATUS.md](PROJECT_STATUS.md) 和 [本轮修正记录](docs/2026-10-04-people-refinement.md)，核对 Sites 当前版本和 GitHub 最新提交。
2. 人物文字只编辑 `content/people.json`，规则见 `content/README.md`。
3. 主要实现：`src/people-courtyard.js`（五区镜头/分组/窗口）、`people-layout.js`（真实字形布局）、`people-distance.js`（手动阅读预算）、`people-story.js`（时间与滑动）、`petal-breath.js`（微浮动）。
4. 原旅程和 Pages 冻结版不改；发布使用原 Sites 项目和原地址。
5. 使用针对性检查、一次必要构建；避免重复完整测试和多轮代理审阅。遇到阻塞先保存 GitHub checkpoint，切换可用方式。
6. 实机视觉验收仍需用户反馈；不要把数学检查当作 Safari 视觉验收。

此前接续记录保留在 [历史交接](docs/archive/2026-10-04-CODEX_HANDOFF.md)。

最新发布：Sites v46，源码 `2e471ffd57f762ad5d0831a45e4bb58cfd7c4166`。代码与检查已保存到 GitHub；先核对修复记录中的实机待验收项，再进行下一部分。

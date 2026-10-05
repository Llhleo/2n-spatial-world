# Codex 接续入口

当前原 Sites 已发布工会历史三站，先读 [发布记录](docs/2026-10-05-guild-history-release.md) 和 [项目状态](PROJECT_STATUS.md)。从 GitHub 开发分支 `experiment/lookback-v2` 接续，不使用旧本地 v49 源码覆盖已完成内容。

1. 已完成三段批准历史，独立编辑 `content/history.json`；人物仍编辑 `content/people.json`。不补造历史事实。规格与计划在 `docs/superpowers/`。
2. 核心代码：`guild-history-data.js`（校验）、`guild-history-route.js`（31 秒可逆采样）、`guild-history-view.js`（三站文字/局部暗底/字体重试）、`guild-history-font.js`（延迟字体）；共用控制器在 `people-story.js` 与 `main.js`。
3. 保留首页金属 2n、高清模型、七个花朵、五区、原旅程、人物与 v45 世界长链。收尾金属模型已停用；收尾设计暂停，不复制首页动画。
4. 最终 215 项检查通过，生产构建通过，审核三项重要异常均已修复。手机真实视觉/GPU 验收尚未做，不把单元检查当作实机验收。
5. 下一步先验收人物至历史衔接、文字换行、长链遮挡和反向滑动，再做小范围润色。未来新收尾需另行设计。
6. 本轮只更新开发分支及原 Sites；不修改 GitHub main/Pages 或旧 Llhleo/2n。先核对当前线上版本与最新 GitHub，再行动。
7. 发布时使用官方 Sites helper。环境 Git 曾使现有文件被还原；使用系统 Git 的 PATH 后 helper 核对推送与归档成功。先保留独立工作源码，绝不发布源码不一致的归档。遇到阻塞先 checkpoint 再改用可用工具。
8. 减少重复完整测试与审阅；仅因新增修改或重要失败再次验证。已完成资源和历史文档不删除。

此前接续内容见历史发布记录和 `docs/archive/`。

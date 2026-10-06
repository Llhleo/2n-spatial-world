# Codex 接续入口

优先读取 [花瓣记忆廊预览记录](docs/2026-10-06-memory-corridor-preview.md)。新构图已部署专用 `?historyPreview=1` 入口；先等待构图反馈，再继续三幕连续动画。不要将本阶段称为完整36秒故事已完成。方案与计划在 `docs/superpowers/`，旧主入口暂时保留。


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


## 已发布：立体花瓣记忆廊（2026-10-06）

- 实现提交：62c63a7f9ecfcf8cb8b94771ef0f1000e5d077b2
- Sites 来源提交：2f10e9d76831d07f23db7052c49c5636009e2823
- 部署：appgdep_6ac4836ec1308191801d9095c581761c，状态 succeeded
- 地址：https://twon-dark-spatial-world.llhleo.chatgpt.site；直达故事预览：https://twon-dark-spatial-world.llhleo.chatgpt.site/?historyPreview=1
- 正式故事和预览均支持滑动切换文字与立体包围，同一批高清花瓣连续迁移；main / Pages 未改。
- 后续：先做真实手机视觉验收，再安排花朵点缀和人物到故事入口的衔接润色；不可重新制作已完成的开头、五境或人物模块。


## 2026-10-06 · 三阶段故事已发布

- 代码提交：880339973a01f8d8f07cae79eaa2de2438c86da5
- Sites 来源：1b88e1a41bd394ebdd96adad8ef3e2f5aaa4c204
- 部署：appgdep_6ac487ec397081919a901fc91f036d4f，succeeded
- 地址：https://twon-dark-spatial-world.llhleo.chatgpt.site；故事直达：https://twon-dark-spatial-world.llhleo.chatgpt.site/?historyPreview=1
- 双链交错 → 球壳包围慢转 → 扩展停转、呼吸浮动。日期/标题/正文共同靠左；尘埃连续保留。35 项相关测试及构建通过。
- 待办：真实手机视觉反馈、花朵点缀、人物至故事入口润色。不要重做已完成部分，不修改 main / Pages 或旧 2n 仓库。


## 2026-10-06 · 双链与球壳修复已部署

代码：f97bf75f727e19965a0d3a2cf7e80cc56adb26a3；Sites 来源：6b4e96e15785220129dfa2338b2aa83250a38f63；部署 appgdep_6ac49a47ca2481919294b009fa2ece91 已成功。
地址：https://twon-dark-spatial-world.llhleo.chatgpt.site/?historyPreview=1。
已移除使球体变方的屏幕矩形位置推移，增加可感知的长链呼吸，平衡第三幕前景尺寸。减少动态效果保留低幅呼吸并关闭自转。37 项相关测试和构建通过；真实手机视觉验收待用户反馈。详细记录 docs/2026-10-06-memory-motion-fix.md。main / Pages 不变。

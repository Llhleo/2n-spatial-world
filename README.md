# 2n Spatial World

2n 公会的五区域 3D 展示网站。现有模型、高清花瓣、花朵和人物文案均保留。

- 在线网站：https://twon-dark-spatial-world.llhleo.chatgpt.site
- 当前开发分支：`experiment/lookback-v2`
- 当前进展：[PROJECT_STATUS.md](PROJECT_STATUS.md)
- 接续工作：[CODEX_HANDOFF.md](CODEX_HANDOFF.md)
- 编辑人物姓名、职务和介绍：[content/people.json](content/people.json)，规则见 [content/README.md](content/README.md)
- 文档目录：[docs/README.md](docs/README.md)

## 目录

| 目录 | 用途 |
| --- | --- |
| `src/` | 场景、加载、镜头、人物展示 |
| `content/` | 可直接编辑的人物文字 |
| `public/assets/` | 线上使用的模型和字体 |
| `scripts/` | 无损传输与资源构建 |
| `tests/`、`test/` | 回归检查 |
| `studies/` | 历史模型与视觉研究，保留供追溯 |
| `docs/archive/` | 已过期的状态和交接快照 |

## 本地运行

Node.js 环境安装依赖后运行 `npm run dev`；生产构建使用 `npm run build`。
构建会自动生成花瓣实例和无损模型传输产物。`node_modules`、`dist` 和生成的模型传输目录不提交。

GitHub Pages 保持花朵冻结版。人物版发布到 Sites；不改 `main`、Pages 配置或工作流。

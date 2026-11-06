---
name: 2n-video-showcase
description: 为 2n Florr 3D 公会网站制作非商业宣传/纪录/展示短片时，使用 video-shotcraft 的镜头卡、Remotion、音乐同步、音效与逐帧验收工作流。仅当用户要求成片、分镜、视觉样片或视频展示时触发；不要用于运行时 Three.js 动画、物体跟踪算法或 NAS 下载优化。
---

# 2n Video Showcase / video-shotcraft

## 何时使用

- 用户要求将 2n 3D 网站拍成完整展示片、历史纪念短片、移动端短视频，或设计视频分镜、节奏与声音时。
- 其他自主开发的工具（例如视频跟踪工具、NAS Download Bridge）需要**产品功能展示视频**时，可借鉴此流程。
- 用户只要求修复网站运镜、滚动卡顿、粒子路径、视频跟踪精度或下载速度时，不触发；此 Skill **不代替** GSAP、Three.js、GPU Shader、OpenCV 或下载器实现。

## 上游资源（首先阅读）

- 原始 Skill：https://github.com/Vincentwei1021/video-shotcraft/blob/main/SKILL.md
- 动画画廊：https://vincentwei1021.github.io/video-shotcraft/
- 分镜配方：https://github.com/Vincentwei1021/video-shotcraft/tree/main/references/shots
- 视觉验收：https://github.com/Vincentwei1021/video-shotcraft/blob/main/references/aesthetic-rules.md
- 视频制作流程：https://github.com/Vincentwei1021/video-shotcraft/blob/main/references/pipeline.md
- 音乐卡拍：https://github.com/Vincentwei1021/video-shotcraft/blob/main/references/music-beat-sync.md
- 剪映导出：https://github.com/Vincentwei1021/video-shotcraft/blob/main/references/jianying-export.md

上游会更新，开始制作前以仓库现有版本为准，选择镜头卡后阅读相应卡片及准确 demo 源码；不要只看配方名称就从零仿写。

## 2n 的内容边界

1. 项目是**非商业、非盈利**的 Florr 公会展示网站；视频应忠实呈现项目和公会，避免虚构商业产品功能或未经证实的历史。
2. 叙事可按 Hero 银白 2n → Garden / Desert / Ocean / Jungle / Hell 五境 → 成员 → 工会故事三段 → 粒子结尾排布，但以当前源码和用户明确需求为准。
3. **只用 Petal，不引入 Mob**；保留花瓣正面结构、正确比例和各区域特征。不要把已有 3D 资产改成模糊的扁平假模型。
4. 任何截取网页、成员资料或截图之前检查是否包含个人隐私、账号、密钥、内部信息；输出仅使用已允许公开的素材。
5. 使用真实网站画面：WebGL 镜头或粒子运动必须使用高质量录屏、浏览器逐帧捕获或独立 Three.js 渲染结果。普通 DOM/全页截图不能替代动态 3D 内容；屏录素材可按 video-shotcraft 的 ClipCard 或 Remotion 片段方式编排。
6. 视觉设计从现有网站与项目审美文档提取，尤其是暗色空间、银白 2n、花瓣配色、镜头空间感；参考作品仅借鉴运动语言，不照搬有版权的画面或音乐。

## 制作工作流

1. **只读检查**：读取本仓库 README、PROJECT_STATUS.md、CODEX_HANDOFF.md、现有部署信息；确认当前可访问的预览版本，不修改项目源码。
2. **定位形式**：根据用户需求选择完整展示片 / 单镜头样片 / 现有片段音画优化。用户明确选择制作模式后直接执行；否则先以已知目标提出简短推荐。
3. **素材采集**：优先用当前 2n 3D 实际网页的高清录屏或可复现帧序列；记录宽高比、帧率、章节时间、镜头动作，必要时分别制作 16:9 与 9:16 版本。
4. **分镜**：先给每镜头唯一信息目标、时长、真实素材源和参考镜头卡；保留内容落定后的阅读/呼吸时间。粒子与花瓣环绕避免突兀方向改变、空间塌缩和无意义镜头抖动。
5. **独立成片工程**：Remotion、视频生成依赖、ffmpeg 和中间素材应放入**与 2n 网站运行时隔离**的工作目录；不得把视频制作依赖追加进网站的生产 bundle。无需改动网站主仓库即可制作视频。
6. **声音**：指定曲目时先分析拍点，再编排转场；未指定时先按画面节奏制作，后选配合法音频。使用音效/BGM 时分别核验许可与署名，允许用户取得无 BGM 版本。
7. **QA**：检查每镜头进入、峰值、落定时的帧；核对画面清晰度、文字可读性、模型正面、镜头平滑、音效同步和人物隐私；保存分镜、关键帧和最终视频。若上游工具有可用编辑工作台或剪映工程导出，可在用户需要时提供。

## 具体镜头映射建议

- **开场**：银白雕塑感 2n 原模型为主体，以缓慢空间推近和对比光强调形体；不重新捏造 2n 字形。
- **五境**：每一境有清晰辨识镜头；以相机位移体现地图连续性，避免黑屏或地形突然出现。
- **成员与历史**：突出真实人物信息与三个时间节点，字卡不被花瓣遮挡，不能同时叠压两个不相关章节。
- **结尾**：直接使用已实现的粒子团、框架穿越、2n 成形与三维花瓣环绕的真实素材；音乐冲击仅用于少量高潮，不持续抖动整个画面。

## 技术边界与授权

- 本 Skill 是**引用与适配指南**，不是上游 video-shotcraft 的完整安装，不会自动带入其模板、demo、音效或工具。
- 真正生成视频时，应先按上游安装文档在**视频制作环境**安装或获取相应代码，确认许可证、素材许可与 Remotion 独立许可。
- 保持 2n 网站的 Three.js / Vite 主工程、部署线路和运行时依赖不变；不将制作素材推入 main 除非用户另有要求。

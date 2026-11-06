---
name: 2n-gsap-animation-integration
description: "为 2n-spatial-world 的 Three.js 3D 叙事评估或小范围接入 GSAP。用于工会历史、人物转场、镜头、花瓣链、滚动联动、倒滑和粒子结尾的动画编排与性能检查；不要无条件引入 GSAP 或重写已稳定的滚动控制器。"
---

# 2n 3D · GSAP 动画编排 Skill

## 目标与边界

在 `Llhleo/2n-spatial-world` 中，将 GSAP 作为**可选的时间轴编排层**，而不是取代 Three.js、现有 GPU Shader、摄像机路径或滚动/自动播放系统。任何接入都必须先确认它确实简化动画或解决可复现问题；不为“引入新技术”而改动成熟模块。

在编辑前先读 `README.md`、`CODEX_HANDOFF.md`、`src/main.js`、`src/manual-history-entry.js`、`src/people-story.js`、`src/guild-history-route.js`、`src/guild-next-route.js`、`src/viewport.js` 及待改动画模块。确认最新 main 与部署规则，保留全部模型、五境、成员和工会历史内容。

## 适用场景与优先级

1. **优先试点：工会故事三幕及章节过渡**。以单个阶段的文字、镜头、花瓣出现与退场为例，把相互依赖的关键帧、延迟和 easing 整理进一个可追踪的 Timeline。
2. **其次：人物转场、花瓣链和镜头接续**。适合编排多个对象的开始/结束和时间偏移；原有 Hermite / Catmull-Rom 空间路径如更适合，应继续使用。
3. **谨慎：粒子结尾**。GSAP 可管阶段间的过渡、字幕、相机与少量参数；粒子位置、Shader、固定 GPU 历史和逐粒独立轨迹仍由现有渲染/数学逻辑负责。
4. **最后再评估 ScrollTrigger**。项目已有自定义进度转换、手动/自动播放切换、惯性阻尼、倒滑保护、overshoot rebase 和 iOS Safari 稳定视口。直接用 ScrollTrigger 的 scrub/pin/snap 全面接管可能引入两套滚动主控，造成跳章、卡顿或地址栏抖动。

## 集成原则

- **单一进度源**：默认保留 `main.js` 计算的归一化章节进度（含 `chapterAt` / `sampleStoryPose`）作为唯一真值。以该进度驱动 `paused: true` 的 GSAP Timeline，调用 `timeline.progress(localT)` / `seek()` 采样；不要让 GSAP ticker、ScrollTrigger、自动播放和自研 frame 同时写同一对象或全局 progress。
- **确定性与可逆性**：相同 progress 必须渲染相同章节关键画面；正滑、倒滑、快速甩动、反向切换和直接跳转都应得到连贯的结果。不得依赖“上次从哪里播到这里”的累加状态，除非该状态已有可重建的历史或快照。倒滑速度策略仍由现有控制器掌握。
- **对象所有权明确**：对每个 camera.position、group.position、rotation、material opacity、DOM transform 指定唯一写入方。GSAP 负责插值/编排时，不得让 `sampleStoryPose` 或 `update()` 在同一帧覆盖 GSAP 的结果。
- **保留渲染职责**：继续由 Three.js `renderer.setAnimationLoop(frame)` 统一渲染；不可新增竞争性的渲染循环。大量花瓣、粒子实例和 Shader uniforms 不逐个创建海量 Tween。
- **性能**：只构建一次 Timeline 并重用；对 DOM 优先使用 transform/opacity；避免布局属性动画、频繁创建/销毁 Tween、逐帧触发 ScrollTrigger.refresh 或全局 will-change。
- **移动端**：保留 `stableViewport` 的 100lvh/100svh 处理及 Safari 原生滚动行为；慎用 `pin`、`ScrollSmoother`、`snap` 与任何 scroll-jacking。
- **无障碍**：尊重 `prefers-reduced-motion`，使用既有 reduced-motion 分支；不要让降低动态效果导致章节不可到达。
- **增量与回滚**：先在新分支针对单一章节做 A/B 试点，留开关或易回退的独立实现；运行时暂不自动安装 `gsap`。只有对比测试表现更好后再提议更广的迁移。

## 最小模式（仅示意，不能直接替换主动画主控）

```js
import { gsap } from 'gsap';

const cue = { opacity: 0 };
const timeline = gsap.timeline({ paused: true })
  .to(cue, { opacity: 1, duration: 1, ease: 'power2.inOut' });

// 放在现有 Three.js frame 中：localProgress 来自项目自身的章节映射。
// 保证 cue.opacity 此时由 GSAP 唯一写入，再把它传给场景对象。
function sample(localProgress, material) {
  timeline.progress(Math.max(0, Math.min(1, localProgress)));
  material.opacity = cue.opacity;
}
```

如确需用 ScrollTrigger，只先试独立 DOM 区域，显式说明它如何映射/替代既有进度源；未经证明不得把 `scrub`、`pin`、`snap` 全局启用。

## 验收要求

- `node --test`、`npm run build`、GitHub Pages 子路径构建通过。
- 对比首屏加载体积、iPhone 13 Pro Max Safari 的帧率与触控表现；视图切换、停止滚动后的状态、倒滑速率、结尾是否到位均需实机测试，不能以单元测试代替。
- 回归重点：Garden 不变；五境地图不动镜头动；人物文字可读且不跳章；工会故事 3 段依序可达；粒子正放/倒放、快速滑动与结尾重播平稳；5 家资源竞速、校验和部署配置保持不变。
- 在 PR 中列出 GSAP 解决的具体问题、可复现步骤、是否减少逻辑复杂度、性能数据和回滚方式。

## 官方参考

- GSAP: https://github.com/greensock/GSAP
- 官方 AI Skills: https://github.com/greensock/gsap-skills
- 优先查阅：`gsap-core`、`gsap-timeline`、`gsap-scrolltrigger`、`gsap-performance`
- Timeline API: https://gsap.com/docs/v3/GSAP/Timeline/
- ScrollTrigger API: https://gsap.com/docs/v3/Plugins/ScrollTrigger/
- GSAP 使用自身的 Standard No Charge License；不要将运行库误记为 MIT（官方 AI Skills 仓库本身标注 MIT）。

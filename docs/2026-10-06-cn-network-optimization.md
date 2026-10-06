# 2n 3D 国内网络优化

日期：2026-10-06

## 目标

- GitHub 继续作为源码仓库和发布源，但不再要求国内访客直接访问 `github.io`。
- 保留现有 3D 画质、模型几何、花瓣数量与现有加载/解码策略。
- 让同一份 Vite 构建可以部署到多个静态托管平台，便于国内入口与海外入口并行。

## 当前发现

- 运行时代码没有把 GitHub Raw 当作外部资源接口；真正的单点问题是 GitHub Pages 本身作为用户入口。
- 仓库运行时资产较大，最大单个源模型超过 11 MB。
- 原实现只为 companion-display 与 map-flowers 生成 gzip + 内容哈希传输副本；五境花瓣仍直接请求原始 GLB。

## 本轮网络优化

### 1. 所有运行时花瓣使用无损压缩传输

`scripts/build-model-transport.mjs` 现在覆盖：

- garden-petals
- desert-petals
- ocean-petals
- jungle-petals
- hell-petals
- companion-display
- map-flowers

每个 GLB 在构建时生成 gzip 传输副本，文件名包含源文件 SHA-256 前缀。运行时下载后会解压，并校验完整长度与 SHA-256；失败时自动退回原始 GLB。模型几何、材质、贴图和最终解码结果不变。

构建前会清理旧的 model-transport 目录，避免历史哈希文件累积进入部署包。

### 2. 浏览器二次访问复用缓存

`fetchAssetBytes` 继续使用 Cache Storage 保存压缩模型，缓存读写有超时保护，不让 iOS Safari 的慢缓存阻塞有效模型。CDN/浏览器 HTTP 缓存同时配合内容哈希文件使用一年 immutable。

### 3. Vite 代码包与 public 大资源分离

Vite 生成的 JS/CSS chunk 改放到 `/app/`，文件名本身带内容哈希，可安全使用一年 immutable。原 `/assets/` 继续只承载 public 模型/字体等资源，避免对未哈希 GLB 误设永久浏览器缓存。

## 部署配置

### Vercel

`vercel.json`

- 构建：`npm run build`
- 输出：`dist`
- `/app/*`：一年 immutable
- `/assets/model-transport/*`：一年 immutable
- 字体：7 天缓存 + 30 天 stale-while-revalidate
- 原始 GLB：1 天缓存，仅作为传输回退

Vercel 是 GitHub Pages 之外的即时镜像入口，不视为中国大陆节点托管的最终方案。

### Tencent EdgeOne Makers

`edgeone.json` 已显式设置：

- Build command: `npm run build`
- Install command: `npm install`
- Output directory: `dist`
- Node.js: `22.11.0`
- `/app/*` 与 `/assets/model-transport/*`：一年 immutable
- 字体：中期浏览器缓存

EdgeOne 官方支持通过 `edgeone.json` 配置上述构建项与响应头。国内正式长期入口建议绑定自定义域名；若选择中国大陆可用区或全球可用区（含中国大陆），自定义域名需要 ICP 备案。

## 发布策略

建议保留三层：

1. 国内主入口：EdgeOne Makers + 自定义域名。
2. 全球/临时备用入口：Vercel。
3. 源码与灾备入口：GitHub Pages。

GitHub Actions 保留现有 Pages 发布，不删除、不替换。以后主站更新时，GitHub 仍负责版本源，用户访问流量由独立静态托管平台承接。

## 本轮未修改

- 3D 场景
- Camera
- 五境视觉
- 花瓣/花朵模型与实例数量
- 画质
- 自动播放与手动滚动
- GitHub Pages workflow

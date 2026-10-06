# 2n 3D 国内网络优化

日期：2026-10-06

## 目标

- GitHub 继续作为源码仓库和发布源，但不再要求国内访客直接访问 `github.io`。
- 保留现有 3D 画质、模型几何、花瓣数量与现有加载/解码策略。
- 让同一份 Vite 构建可以部署到多个静态托管平台，便于国内入口与海外入口并行。

## 当前发现

- 运行时代码没有把 GitHub Raw 当作外部资源接口；真正的单点问题是 GitHub Pages 本身作为用户入口。
- 仓库包含较多 GLB，最大单个源模型超过 11 MB；现有构建已经会为 companion-display 与 map-flowers 生成 gzip + 内容哈希的无损传输副本。
- 因此本轮不降低模型质量，不重复做模型压缩；重点改为多入口、边缘缓存和浏览器缓存。

## 已增加的部署配置

### Vercel

`vercel.json`

- 构建：`npm run build`
- 输出：`dist`
- 内容哈希的 `assets/model-transport/*` 使用一年 immutable 缓存。
- 字体使用 7 天浏览器缓存 + 30 天 stale-while-revalidate。
- 非哈希 GLB 仅使用 1 天浏览器缓存，避免以后模型更新被旧缓存长期锁死。

Vercel 作为 GitHub Pages 之外的即时镜像入口，不应被视为中国大陆节点托管的最终方案。

### Tencent EdgeOne Makers

`edgeone.json`

- 对内容哈希模型传输文件使用一年 immutable 缓存。
- 字体使用中期浏览器缓存。
- 其他静态资源保持 EdgeOne 默认缓存策略，避免对未带哈希的 GLB 设置过长浏览器缓存。

推荐导入参数：

- Repository: `Llhleo/2n-spatial-world`
- Production branch: `main`
- Build command: `npm run build`
- Output directory: `dist`
- Node.js: 22
- Base path: `/`

国内正式长期入口建议绑定自定义域名。若选择中国大陆可用区或全球可用区（含中国大陆），域名需完成 ICP 备案。

## 发布策略

建议保留三层：

1. 国内主入口：EdgeOne Makers / 阿里云 ESA Pages + 自定义域名。
2. 全球备用入口：Vercel。
3. 源码与灾备入口：GitHub Pages。

GitHub Actions 继续保留现有 Pages 发布，不做删除或替换。以后主站更新时，GitHub 仍负责版本源，用户访问流量由独立静态托管平台承接。

## 本轮未修改

- 3D 场景
- Camera
- 五境视觉
- 花瓣/花朵模型
- 画质
- 自动播放与手动滚动
- GitHub Pages 工作流

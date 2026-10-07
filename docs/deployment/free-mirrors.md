# 免费多线路加载与自动更新

基于 feature/next-journey 的 b91ac412212a82d20119cd634b65e588392c5698，保留最新结尾、重播修复和所有高清资产。

## 下载行为

每个模型先读按 SHA-256 标识的浏览器缓存。原源先发起下载，2 秒未完成时启动备用源，同时最多两份下载。第一个完成解压、GLB 检查、长度和 SHA-256 校验的结果获胜，取消另一份下载。后续优先使用上一个有效源；失败时仍会尝试其他源。压缩资源均失败后保留本页原 GLB 回退。成功资源保留，重试不刷新页面。

所有 41 个唯一模型（高清花瓣、花朵、五境花瓣）统一生成内容哈希压缩文件；此构建原始 53,803,588 字节，无损传输 39,514,097 字节。未简化模型或贴图。

`VITE_ASSET_MIRRORS` 是逗号分隔的 HTTPS 静态资源根地址，例如 `https://2n.llhleo.top/,https://2n-spatial-world.vercel.app/`。未设置时只使用已有 Vercel 生产地址。Cloudflare 地址在成功部署、确认 CORS 后才加入配置。字体、JS 和网页入口继续由各站自己提供，当前竞争机制仅覆盖 GLB。

## 自动更新

Vercel 项目 `2n-spatial-world` 已通过 Git 集成关联本仓库，已观察到 main 生产部署和 feature/next-journey 推送产生的自动预览部署。main 是正式发布来源；功能分支自动产生预览，不能把未合并分支当成 main。两家必须跟踪同一正式分支、运行相同构建。无需额外 Vercel Token 或付费服务。

Cloudflare Pages 已连接 Git 仓库 Llhleo/2n-spatial-world；当前试发布生产分支 perf/free-mirrors-2026-10-07；构建命令 npm run build；输出 dist。CF 随此分支更新，Vercel main 自动发布不变；两家尚未统一正式发布分支，不能声称任意分支的新版本自动同步。现有 2n.llhleo.top 被 Worker 占用，不覆盖；新自定义域名待确认。项目中已有 public/_headers 设置 CORS 与内容哈希文件长期缓存，vercel.json 提供等价响应头。不要将 `.glb.gz` 强制标记成 Content-Encoding: gzip；程序兼容返回压缩字节或平台已解压的 GLB。

每次构建生成 `/release.json`，携带平台提供的 Git commit SHA，no-cache，可对比两个站是否完成同一版本部署。异步部署期间某镜像缺少新哈希文件时回退可用源；旧代码不会接受内容不匹配的新模型。不宣称多平台发布具有原子性。

## 费用与入口

使用 Pages 静态托管和 Vercel Hobby，不启用 R2、付费 Worker 或付费计划。域名续费独立于托管。镜像落地复制全部静态产物，不能运行时代理回 GitHub。Cloudflare 与 Vercel 是独立供应商；Vercel 自定义子域名应设 DNS-only。

网页入口完全无法访问时，其 JS 无法自动切换，应同时公开主站和备用站链接。免费境外托管不能保证国内速度；仍需国内三运营商、iPhone Safari 冷缓存测试。测量首帧、解除开屏锁、下载、解码、预热分阶段耗时，不把本机下载速度当成中国网络实测。

## 本轮验证

259 项 Node 检查通过；生产构建通过；无超过 25 MiB 的构建文件。新增测试覆盖备用源胜出并取消停滞请求、拒绝错误版本、全源失败有限退出。Cloudflare Pages 和域名绑定待可用接口或经批准的浏览器操作，未配置即不属于已完成的自动更新链路。

## 2026-10-07：公开部署与隐藏日志

开屏“加载详情”使用原生 details，默认折叠。展开后显示主加载阶段、最近线路、下载/缓存/失败计数及最近 60 条请求、胜出、缓存、解析和失败事件；支持关闭按钮及 Escape，开屏结束随加载状态隐藏。仅展开时限频更新，不增加动画帧负担，不持久化，不显示 URL query 或请求头。模型下载按绝对 URL 去重，本站不会与本站别名重复竞争。

早一轮 Pages/DNS 接口尚缺 Git 连接能力；后续新增 cf_pages_create_github_project 已实际成功创建 Git 集成项目，不再存在该接口阻塞。现有 2n.llhleo.top 是 Worker 管理的只读 AAAA 记录，不覆盖。

用户已明确授权公开 Vercel 部署。本轮验证日志与下载逻辑，Vercel Git 集成继续自动构建分支预览；生产 main 自动发布不变。此次功能分支正式部署只更新 Vercel，不合并 main，不更改 GitHub Pages。浏览器实机检查及国内线路速度仍需单独验收。

## 2026-10-07：CF 独立线路上线

项目 2n-spatial-world；公开入口 https://2n-spatial-world.pages.dev/ 。部署 c93ed079-ff57-4915-8f30-61938cdf09df，源码 0839f1ac95b43339770f2118045580d0d676d484；平台 build/deploy 均 success。新浏览器可无登录打开站点，默认折叠“加载详情”。测试浏览器无 WebGL 2，未完成 3D 动画视觉验收；资源 HTTP 校验被当前执行环境访问限制阻挡，未宣称完成 CORS/模型下载验收。CF 不经 Vercel 代理，页面、字体、脚本和原始模型均由独立静态产物提供；已有模型竞速在 CF 入口使用同源和 Vercel 备用。Vercel/其他入口尚未新增 CF 为默认模型镜像，待资源响应核验。

当前 CF 开启 perf/free-mirrors-2026-10-07 分支的 production_deployments_enabled，后续该分支提交会自动构建。域名 spatial.llhleo.top 尚未写 DNS，查询未发现现有记录；若获准，可 CNAME 到 2n-spatial-world.pages.dev 并绑定 Pages。免费全球 CF 非付费 China Network，国内访问与速度待用户实测；入口本身不可达时资源竞速无法解决，必须提供独立入口。

## 2026-10-07 11:57：域名绑定与第三资源源核对

用户授权绑定 2n.llhleo.top，已删除旧 Worker。DNS 查询无记录；Pages 已登记域名。新增 proxied CNAME（2n.llhleo.top -> 2n-spatial-world.pages.dev）返回 Cloudflare API 403 Authentication error。随后 DNS 仍为空，Pages 为 pending / CNAME record not set。域名尚未完成；需修复 DNS 写入凭据权限后继续，不反复重试同一认证失败。

远程加载器默认仅配置本站和 Vercel，CF 无镜像环境变量覆盖：实际两条资源候选，不是三条。自有域名与 pages.dev 是同一 CF 源；缓存和原GLB回退不算独立线路。GitHub Pages 的 release.json 和当前内容哈希压缩模型样本均404，未接入当前竞速。

jsDelivr 新候选已实际 GET 全部41个原始GLB（固定提交0839f1ac95b43339770f2118045580d0d676d484），全部200、跨域*、长度与SHA-256匹配，合计53,803,588字节，无失败。例：https://cdn.jsdelivr.net/gh/Llhleo/2n-spatial-world@0839f1ac95b43339770f2118045580d0d676d484/public/assets/garden-petals/rock.glb 。原始GLB在GitHub中，构建生成的model-transport压缩文件未在仓库中；接入必须适配路径、保持内容校验，随构建固定commit。官方分支缓存12小时，不适合作即时更新。只完成寻找和验证，尚未修改加载器，非国内测速。

完整第三托管候选：EdgeOne Makers/Pages官方Free支持Git与自动CI/CD，可部署同一dist，另配置CORS和内容哈希缓存；大陆可用区自定义域名要求备案，海外区域需国内实测。尚未部署。Netlify Free目前300credits/月，生产部署15credits、流量20credits/GB，3D流量下额度偏紧，不优先。

来源：https://github.com/jsdelivr/jsdelivr 、https://pages.edgeone.ai/pricing 、https://pages.edgeone.ai/document/domain-overview 、https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/ 。

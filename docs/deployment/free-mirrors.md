# 免费多线路加载与自动更新

基于 feature/next-journey 的 b91ac412212a82d20119cd634b65e588392c5698，保留最新结尾、重播修复和所有高清资产。

## 下载行为

每个模型先读按 SHA-256 标识的浏览器缓存。原源先发起下载，2 秒未完成时启动备用源，同时最多两份下载。第一个完成解压、GLB 检查、长度和 SHA-256 校验的结果获胜，取消另一份下载。后续优先使用上一个有效源；失败时仍会尝试其他源。压缩资源均失败后保留本页原 GLB 回退。成功资源保留，重试不刷新页面。

所有 41 个唯一模型（高清花瓣、花朵、五境花瓣）统一生成内容哈希压缩文件；此构建原始 53,803,588 字节，无损传输 39,514,097 字节。未简化模型或贴图。

`VITE_ASSET_MIRRORS` 是逗号分隔的 HTTPS 静态资源根地址，例如 `https://2n.llhleo.top/,https://2n-spatial-world.vercel.app/`。未设置时只使用已有 Vercel 生产地址。Cloudflare 地址在成功部署、确认 CORS 后才加入配置。字体、JS 和网页入口继续由各站自己提供，当前竞争机制仅覆盖 GLB。

## 自动更新

Vercel 项目 `2n-spatial-world` 已通过 Git 集成关联本仓库，已观察到 main 生产部署和 feature/next-journey 推送产生的自动预览部署。main 是正式发布来源；功能分支自动产生预览，不能把未合并分支当成 main。两家必须跟踪同一正式分支、运行相同构建。无需额外 Vercel Token 或付费服务。

Cloudflare Pages 尚未连接，所需配置：Git 仓库 Llhleo/2n-spatial-world；生产分支 main；构建命令 npm run build；输出 dist；Node 22 或 24；绑定 2n.llhleo.top。项目中已有 public/_headers 设置 CORS 与内容哈希文件长期缓存，vercel.json 提供等价响应头。不要将 `.glb.gz` 强制标记成 Content-Encoding: gzip；程序兼容返回压缩字节或平台已解压的 GLB。

每次构建生成 `/release.json`，携带平台提供的 Git commit SHA，no-cache，可对比两个站是否完成同一版本部署。异步部署期间某镜像缺少新哈希文件时回退可用源；旧代码不会接受内容不匹配的新模型。不宣称多平台发布具有原子性。

## 费用与入口

使用 Pages 静态托管和 Vercel Hobby，不启用 R2、付费 Worker 或付费计划。域名续费独立于托管。镜像落地复制全部静态产物，不能运行时代理回 GitHub。Cloudflare 与 Vercel 是独立供应商；Vercel 自定义子域名应设 DNS-only。

网页入口完全无法访问时，其 JS 无法自动切换，应同时公开主站和备用站链接。免费境外托管不能保证国内速度；仍需国内三运营商、iPhone Safari 冷缓存测试。测量首帧、解除开屏锁、下载、解码、预热分阶段耗时，不把本机下载速度当成中国网络实测。

## 本轮验证

259 项 Node 检查通过；生产构建通过；无超过 25 MiB 的构建文件。新增测试覆盖备用源胜出并取消停滞请求、拒绝错误版本、全源失败有限退出。Cloudflare Pages 和域名绑定待可用接口或经批准的浏览器操作，未配置即不属于已完成的自动更新链路。

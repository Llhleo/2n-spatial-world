# 道路历史分支预览

基于 main `467de098d542353a5f6f61aedd745d394237ab30`，分支 `feat/road-history-gesture-playback`。原 main 和原 Site 保持发布版本。

完整网站默认启用新控制。预览加 `?roadPreview=1`，资源准备好后沿人物链进入第一幕；下滑进入下一处阅读停留，上滑从当前画面倒放。一次手势最多请求一段；松手继续播放至可读停留点。滚动距离、惯性和速度不会改变动画时间倍率。自动播放仍可连续观看完整原站流程。`?playback=legacy` 保留旧控制供对照，`?historyPreview=1` 保留原诊断页面。

道路花瓣使用原站 14 种高清真实 PETAL，平均间距约为 v11 的三分之一。正反车道分别使用种子随机间距，按实际道路长度移动，在雾外循环；9035 为跨三幕含场外回收池的总实例储备，不是同时显示数量。前景、道路、背景、光珠使用独立环境时钟。背景沿用隔行反向的小 2n 潮汐字线，使用 GPU 变形。三个发光旅行者共用闭合曲线并错相运行，核心、拖尾保留深度测试，点光照亮附近表面。

三幕事实来自 content/history.json；第三幕使用真实 unique 事件，不虚构其具体种类。矢量字形使用原站本地中文字体和等宽日期，正文增大到约14px（414×896参考）。道路帧固定在世界中；入口接真实人物链，出口提前在远景显现原有结尾花瓣，并物理移动相机进入原粒子场。原粒子数量和动作未修改。

验证：完整原测试与新增手势／场景检查；18条字形与 FreeType 光栅对照，最低 IoU 0.932；10分钟、0.5秒采样及线性扫掠的外接球检查无重叠，最小扫掠余量约0.365；横竖屏相机端面、回收点和边界连续性检查通过。这是抽样和线性扫掠检查，不是连续三角网格碰撞证明。

远程浏览器无 WebGL 2，不能验收着色器实际画面；真实 iPhone 13 Pro Max Safari 的字形可读性、光晕遮挡及帧率仍需实机确认。构建成功不等同于实机视觉验收。

字体重新生成：依次执行 `python scripts/road-story/make_vector_text.py`、`python scripts/road-story/resolve_font.py`、`node scripts/road-story/triangulate_text.mjs`、`python scripts/road-story/verify_font.py`。需要 fontTools、Shapely、Pillow、NumPy；许可证随字体保存。交通审计执行 `node scripts/road-story/audit-traffic.mjs`。

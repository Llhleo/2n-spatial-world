# 结尾粒子实验

基于 main 2a8ce13；仅 experiment/particle-ending，禁止自动合 main 或发布正式 Pages。

用户要求：明确参考 FrostNovaOrg/world-execute-web，先做好审美，不减少粒子数量。

参考源码：engine/swarm.js 的错峰形态插值、弧线迁移和流动扰动；engine/rig.js 的主体环绕与镜头收束；engine/post.js 的分段亮度；pre1/phyllo.js 的旋转秩序。没有复制源代码；实现为独立编写。参考仓库代码许可证为 AGPL-3.0-or-later，后续若直接移植其代码须单独处理许可。

实现：262144 粒子，五色纵深星流→螺旋→错峰形成切面 2 与独立 n→银白余光。GPU 执行变形与发光点核；目前采用粒子自身的柔光晕，没有引入参考仓库完整多级后处理泛光。峰值后亮度降低，避免永久高亮。完整高清花瓣先旋舞后进入有投影间距的立体轨道，不替换模型或材质，不改正面校正。

镜头最大环绕约35度，中段抬升，终态回正拉远。结尾文字移到下方，保留文案、唯一重看按钮。为隔离实验，本轮仍保留现有16秒结尾与原滚动路由，没有采用前期建议的20–25秒重定时。

范围：仅新 ending 模块、memory scene 的结尾接入、结尾文字位置及相应测试。五境、Garden、历史主体、五供应商资源竞速及生产发布配置不改。

验证：node --test 298/298。生产构建通过（既有chunk提示）。当前受管理环境无 control-browser，未做 WebGL 着色器运行与浏览器视觉核验；也未做真实 iPhone 性能验收，不能把数值检查等同审美验收。粒子密度保持原要求，后续按反馈调整。


## 第二版：按手机截图修正

用户实机反馈流畅，无须减少粒子。加法混合让交汇区和收束区变白，改为 NormalBlending 的有界透明覆盖；控制单点覆盖率与像素尺寸，保留全部262144粒子和五色运动。该混合是颜色加权覆盖，密集区不会无限累加到纯白。

粒子终态不再使用自绘笔画。直接调用 createMonument，以三角形表面积加权采样真实开头金属2n模型的表面与法线，保留角标n、原比例、切面与厚度。法线控制银白明暗。

新增 studies/ending 独立入口及 scripts/build-ending-preview.mjs；仅加载14种高清结尾花瓣、结尾文字与粒子，带20秒独立播放、暂停、重播和进度拖动。正式网站路由仍16秒，未改变。Sites改为只发布此结尾入口，GitHub正式主页不改。

验证：全部299项测试通过；独立结尾生产构建通过。新增模型边界、角标n高度、法线采样及混合模式检查。浏览器视觉核验仍不可用，以用户手机截图继续验收。


## 第三版：修复实际发布入口

用户截图显示独立预览仍为旧右侧弧线。核对发现 Sites 源码中的 guild-memory-scene.js 与 guild-next-view.js 沿用了旧版本，粒子模块并未被场景导入。补齐这两个文件，逐文件核对运行源码；新增入口激活测试、构建产物 ending-shape-swarm/aNormal 检查及浏览器入口缺失时的错误提示。不得仅凭文字显示的粒子数量认定已接入。


## Visibility correction after mobile screenshots

The previous alpha cap (0.07, with energy multiplied by 0.12) and 3.5-pixel point cap made the swarm barely visible. Increase point diameter to a 1.8–8 physical-pixel range and alpha to energy × 1.6 capped at 0.58; apply the renderer output color-space conversion. Keep ordinary alpha blending, all 262,144 particles, the sculpture sample and existing camera/morph choreography. Dense intersections remain bounded by palette colors. Build and CPU scene tests do not replace visual verification on iPhone Safari.

## 立体螺旋版（2026-10-11）

修改前已将亮度版提交 158c2fb 保存为 checkpoint/particle-ending-brightness-20261011。

按用户确认方案改造结尾：参考 world-execute-web 的 src/ch/07_pre2.js helixP（角度与高度绑定）和 src/ch/pre1/duo.js pairCam（侧前方环绕），不复制整段演出。将宽环面改为绕倾斜轴上升的两圈窄带；五境颜色分配到相邻但分离的五条轨道，圈距78、色带间距5、半宽1.2。CPU路径样本直接作为 aHelix GPU 属性，沿路径上行并在两端柔和淡出，避免循环瞬移。近侧较亮、远侧略暗，保留亮度版的光点尺寸与普通透明混合，全部262144粒子不变。

螺旋在结尾进度34%至62%完整保形（独立20秒预览约5.6秒，正式16秒时间映射约4.5秒）。镜头在侧前方缓慢环绕40°并略抬高，随后回正；五色分批收束到原开头模型表面。外围花瓣保持独立深度并跟随螺旋走势，最终仍进入原有分层排布。Sites仅发布独立结尾，不改main、Pages或其他正式托管。

验证：新增两圈上升、圈距、色带间隙、保形时间检查；现有镜头入口连续性、终态、模型轮廓和场景接入检查通过。对竖屏宽高比0.46/0.6及横屏1.8进行投影范围计算，主体在螺旋阶段不超出画面。独立构建通过（保留已有大包体积警告）。无可用的受支持浏览器QA，未声称GPU着色器/实机视觉已验收，以iPhone Safari反馈继续迭代。

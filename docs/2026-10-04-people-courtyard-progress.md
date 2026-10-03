# 花瓣同行庭院实施进度（2026-10-04）

用户已确认设计稿、实施计划、子代理方式和独立 worktree。按已有项目继续，不重做资产，不改旧 Llhleo/2n、main 或 Pages。介绍仍在 content/people.json。

## 已保存阶段

Task 1 已完成：共享世界空间路线、5 位管理层与按原顺序每 7 人分组的成员窗口、确定性正反滚采样、既有高清花瓣来源 key。源文件 src/people-courtyard.js；仅新增路线，尚未替换线上画面。

本地代码 checkpoint：250a30090414dfe42a6261f6f497bf3c9f9c0ebc；基线 ed2bc1aa3c8071c0c25590c7a6600189a0f0f005。独立任务审查结论：Spec compliant、Task quality approved。定向测试 4/4、完整 suite 157/157；基线 153/153。已有故障恢复 fixture 输出预期 offline warning，不是新增失败。

## 下一阶段

Task 2 连续镜头与字形投影正在实施。后续依次为：Task 3 无闪烁人物及成员对象池；Task 4 有层次高清花瓣环境；Task 5 时间映射、自动播放与恢复接入；Task 6 整段验收、checkpoint 和原 Sites 更新。

## 审查待跟进

- 编辑内容的 leader ID 可能与 route 自有 ID 重名：在 Task 3 排版/resize 时加命名空间，保留原人物 ID。
- 加强镜头导数/透明度在边界上的测试（Task 2/3）。
- 花瓣 scale 是目标展示外径，Task 4 必须按实际几何尺寸归一化，并保持入口的实时圆环变换连续。

## 验证与发布界线

原 Sites 当前仍为 v42：https://twon-dark-spatial-world.llhleo.chatgpt.site ，源码 537be1fc60418af393cf9511549b91e5dd77fe8a。本轮尚未发布人物改版。Pages 保持既有花朵冻结版。

受支持的 managed preview 要求 control-browser 技能，当前目录未提供该技能，未绕过其浏览器边界。尚无本轮连续浏览器视频、手机视觉、启动/帧时间/内存实测；不能把测试通过写成视觉或性能通过。开发继续，验收限制会在发布前明确报告。

## 已作决定

1. 空成员数组的有效路线须支持，不放松无效记录校验；实查 normalizePeople 已接受空数组，未建立绕过路径。
2. 中间任务保留现有 optional-route 兼容，直到 Task 5 接入新路线再移除不再使用的旧路径；风险是暂时双路径，须在集成审查关闭。
3. 缺少浏览器实测不阻塞纯代码开发，但性能与视觉不宣称通过；风险是回退尚不可见，必须保留为未验项。

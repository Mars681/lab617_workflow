export const workflow = {
  "config.title": "配置",
  "config.workflowName": "工作流名称",
  "config.globalInput": "全局输入",
  "config.readOnly": "演示模式只读",
  "config.edit": "编辑代码",
  "config.view": "可视化",
  "config.defaultName": "示例工作流",
  "btn.run": "运行工作流",
  "btn.running": "运行中...",

  "toolbox.title": "工具箱",
  "toolbox.loading": "加载工具中...",

  "canvas.title": "工作流步骤",
  "canvas.subtitle": "拖拽项目以重新排序逻辑执行顺序。",
  "canvas.clear": "清空全部",
  "canvas.empty.title": "工作流为空",
  "canvas.empty.subtitle": "点击左侧工具或让 AI 帮你构建。",
  "canvas.deleteEdge": "删除连线",

  "upload.title": ".mat/.csv 上传",
  "upload.pickFile": "请先选择 .mat 或 .csv 文件。",
  "upload.button": "上传到后端并写入 JSON (.mat / .csv)",
  "upload.uploading": "上传中...",
  "upload.success": "上传成功：{{filename}} → {{path}}",
  "upload.failure": "上传失败：{{message}}",
  "upload.choose": "选择文件",
  "upload.noFile": "未选择文件",

  "input.invalidJson": "JSON 语法无效。",
  "input.invalidJsonAlert": "JSON 输入无效",

  "alert.noEntryNodes": "未找到入口节点，请至少添加一个无入边的节点。",
  "alert.cycleDetected": "检测到可能的循环或失控分支，执行已停止。",
  "alert.toolNotRegistered": "工具未注册到后端工具池：{{toolId}}\n请检查 getAvailableTools() 是否返回该工具。",

  "logs.title": "执行日志",
  "logs.empty.title": "准备就绪",
  "logs.empty.subtitle": "点击“运行工作流”按钮开始。",
  "logs.input": "输入",
  "logs.output": "输出",
  "logs.openChart": "📊 点击打开 DiPCA 监控图",

  "workflow.help.welcome": "欢迎使用编排器",
  "workflow.help.subtitle": "MCP 工具的可视化工作流构建器",
  "workflow.help.step1.title": "构建",
  "workflow.help.step1.desc": "点击工具箱中的工具，或在中间画布拖拽步骤以重新排序。",
  "workflow.help.step2.title": "执行",
  "workflow.help.step2.desc": "点击左侧边栏紫色的“运行工作流”按钮来执行你的逻辑。",
  "workflow.help.step3.title": "AI 辅助",
  "workflow.help.step3.desc": "使用浮动聊天按钮（右下角）让 Gemini 帮你构建工作流。",
  "workflow.help.getStarted": "开始使用",

  "logs.resize.title": "拖拽调整日志面板宽度",
  "toolbox.category.fallback": "工具"
};


import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      "app.title": "Orchestrator",
      "app.subtitle": "MCP Workflow Builder",
      "config.title": "Configuration",
      "config.workflowName": "Workflow Name",
      "config.globalInput": "Global Input (JSON)",
      "config.readOnly": "Read-only in Demo",
      "btn.run": "Run Workflow",
      "btn.running": "Running...",
      "header.editMode": "Edit Mode",
      "header.howToUse": "How to use",
      "toolbox.title": "Toolbox",
      "canvas.title": "Workflow Steps",
      "canvas.subtitle": "Drag items to reorder logic execution.",
      "canvas.clear": "Clear All",
      "canvas.empty.title": "Workflow is empty",
      "canvas.empty.subtitle": "Click tools on the left or ask AI to build it.",
      "logs.title": "Execution Logs",
      "logs.empty.title": "Ready to execute",
      "logs.empty.subtitle": "Click the \"Run Workflow\" button on the left sidebar.",
      "logs.input": "Input",
      "logs.output": "Output",
      "chat.title": "AI Assistant",
      "chat.placeholder": "Type a message...",
      "chat.welcome": "Hi! I'm your Workflow Assistant. Tell me what to add, e.g., 'Add matrix addition and then normalize data'.",
      "chat.error": "Something went wrong.",
      "chat.success": "Successfully added {{toolId}}",
      "help.welcome": "Welcome to Orchestrator",
      "help.subtitle": "Visual Workflow Builder for MCP Tools",
      "help.step1.title": "Build",
      "help.step1.desc": "Click tools in the Toolbox or drag steps to reorder them in the center canvas.",
      "help.step2.title": "Execute",
      "help.step2.desc": "Click the purple \"Run Workflow\" button on the left sidebar to execute your logic.",
      "help.step3.title": "AI Assist",
      "help.step3.desc": "Use the floating chat button (bottom-right) to ask Gemini to build workflows for you.",
      "help.getStarted": "Get Started",
      
      // Categories
      "cat.math": "math",
      "cat.data": "data",
      "cat.analysis": "analysis",
      "cat.utility": "utility",

      // Tool Names & Descriptions
      "tool.matrix.add.name": "Matrix Addition",
      "tool.matrix.add.desc": "Add two matrices together.",
      "tool.matrix.mul.name": "Matrix Multiplication",
      "tool.matrix.mul.desc": "Multiply two matrices.",
      "tool.matrix.inv.name": "Matrix Inversion",
      "tool.matrix.inv.desc": "Calculate the inverse of a matrix.",
      "tool.data.normalize.name": "Data Normalization",
      "tool.data.normalize.desc": "Normalize a dataset to 0-1 range.",
      "tool.poly.fit.name": "Polynomial Fit",
      "tool.poly.fit.desc": "Fit a polynomial to data points.",
      "tool.poly.evaluate.name": "Polynomial Evaluate",
      "tool.poly.evaluate.desc": "Evaluate a polynomial at given x.",
      "tool.error.metrics.name": "Error Metrics",
      "tool.error.metrics.desc": "Calculate MSE and MAE errors.",
      "tool.utils.log.name": "Logger",
      "tool.utils.log.desc": "Log current state to console."
    }
  },
  zh: {
    translation: {
      "app.title": "编排器",
      "app.subtitle": "MCP 工作流构建器",
      "config.title": "配置",
      "config.workflowName": "工作流名称",
      "config.globalInput": "全局输入 (JSON)",
      "config.readOnly": "演示模式只读",
      "btn.run": "运行工作流",
      "btn.running": "运行中...",
      "header.editMode": "编辑模式",
      "header.howToUse": "使用说明",
      "toolbox.title": "工具箱",
      "canvas.title": "工作流步骤",
      "canvas.subtitle": "拖拽项目以重新排序逻辑执行顺序。",
      "canvas.clear": "清空全部",
      "canvas.empty.title": "工作流为空",
      "canvas.empty.subtitle": "点击左侧工具或让 AI 帮你构建。",
      "logs.title": "执行日志",
      "logs.empty.title": "准备就绪",
      "logs.empty.subtitle": "点击左侧边栏的“运行工作流”按钮。",
      "logs.input": "输入",
      "logs.output": "输出",
      "chat.title": "AI 助手",
      "chat.placeholder": "输入消息...",
      "chat.welcome": "你好！我是你的工作流助手。告诉我你要添加什么，例如：“添加矩阵加法，然后归一化数据”。",
      "chat.error": "出错了。",
      "chat.success": "已成功添加 {{toolId}}",
      "help.welcome": "欢迎使用编排器",
      "help.subtitle": "MCP 工具的可视化工作流构建器",
      "help.step1.title": "构建",
      "help.step1.desc": "点击工具箱中的工具，或在中间画布拖拽步骤以重新排序。",
      "help.step2.title": "执行",
      "help.step2.desc": "点击左侧边栏紫色的“运行工作流”按钮来执行你的逻辑。",
      "help.step3.title": "AI 辅助",
      "help.step3.desc": "使用浮动聊天按钮（右下角）让 Gemini 帮你构建工作流。",
      "help.getStarted": "开始使用",

      // Categories
      "cat.math": "数学",
      "cat.data": "数据",
      "cat.analysis": "分析",
      "cat.utility": "工具",

      // Tool Names & Descriptions
      "tool.matrix.add.name": "矩阵加法",
      "tool.matrix.add.desc": "将两个矩阵相加。",
      "tool.matrix.mul.name": "矩阵乘法",
      "tool.matrix.mul.desc": "将两个矩阵相乘。",
      "tool.matrix.inv.name": "矩阵求逆",
      "tool.matrix.inv.desc": "计算矩阵的逆矩阵。",
      "tool.data.normalize.name": "数据归一化",
      "tool.data.normalize.desc": "将数据集归一化到 0-1 范围。",
      "tool.poly.fit.name": "多项式拟合",
      "tool.poly.fit.desc": "对数据点进行多项式拟合。",
      "tool.poly.evaluate.name": "多项式求值",
      "tool.poly.evaluate.desc": "在给定的 x 处计算多项式。",
      "tool.error.metrics.name": "误差指标",
      "tool.error.metrics.desc": "计算 MSE 和 MAE 误差。",
      "tool.utils.log.name": "日志记录器",
      "tool.utils.log.desc": "将当前状态记录到控制台。"
    }
  }
};

// Handle ESM default export inconsistencies (common in non-bundled environments like esm.sh)
// @ts-ignore
const i18n = i18next.default || i18next;
// @ts-ignore
const initReact = initReactI18next.default || initReactI18next;

i18n
  .use(initReact)
  .init({
    resources,
    lng: "en", // default language
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;

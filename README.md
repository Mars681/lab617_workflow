# GenAI Workbench (GenAI 工作台)

这是一个基于 React + TypeScript 的综合性 AI 生产力套件，集成 Google Gemini AI，包含三个核心模块：**通用问答助手 (General Chat)**、**可视化工作流编排器 (Workflow Orchestrator)** 以及 **智能写作助手 (Smart Writer)**。

## 📁 项目结构 (Project Structure)

为了便于团队协作和模块化维护，项目采用严格的**按页面拆分 (Page-based)** 架构，并将所有后端交互统一管理：

```text
src/
├── api/                     # [核心] API 接口层 (统一管理所有后端/模型通信)
│   ├── auth.ts              # -> 认证与健康检查
│   ├── gemini.ts            # -> 通用 LLM 调用 (Gemini/OpenAI/Ollama)
│   ├── writer.ts            # -> 写作模块专用接口 (流式生成、大纲生成)
│   ├── workflow.ts          # -> 工作流模拟后端
│   └── rag/                 # -> RAG 知识库接口模块 (文件管理、检索)
├── locales/                 # [模块化] 多语言配置目录
│   ├── en/                  # 英文翻译源文件
│   └── zh/                  # 中文翻译源文件
├── lib/                     # [静态] 核心定义与工具
│   └── workflow/            # -> 工作流工具定义 (tools.ts)
├── pages/                   # [模块化] 页面级业务组件
│   ├── login/               # -> 登录与认证模块
│   ├── chat/                # -> 通用问答模块
│   ├── workflow/            # -> 工作流编排模块
│   ├── edit/                # -> 智能写作模块
│   └── components/          # -> 公共 UI 组件 (Settings, Visualizer)
├── services/                # [纯前端] 状态与配置服务 (LocalStorage, Debug, Config)
├── App.tsx                  # 路由与主布局
└── ...
```

---

## 🤝 合作开发注意事项 (Collaboration Guidelines)

本项目采用了**按功能模块拆分**的模式。为了避免代码冲突，请遵循以下规范：

### 1. 页面与代码组织 (Code Organization)
请根据你负责的功能模块，在特定的目录下工作：

*   **🟢 通用问答 (Chat) 开发人员**：
    *   **代码目录**: `pages/chat/`
    *   **职责**: 负责基础聊天界面交互、消息流展示。

*   **🔵 工作流 (Workflow) 开发人员**：
    *   **代码目录**: `pages/workflow/`
    *   **职责**: 负责画布拖拽逻辑、节点渲染、Mock 执行引擎。
    *   **工具定义**: 新增工具请编辑 `src/lib/workflow/tools.ts`。

*   **🟣 智能写作 (Writer) 开发人员**：
    *   **代码目录**: `pages/edit/`
    *   **职责**: 负责 Markdown 编辑器交互、大纲渲染、右键菜单逻辑。

*   **🟤 登录/认证 (Login) 开发人员**：
    *   **代码目录**: `pages/login/`
    *   **职责**: 负责登录 UI 交互。

*   **🟠 RAG / 知识库开发人员**：
    *   **代码目录**: `pages/knowledge/` 和 `src/api/rag/`
    *   **职责**: 负责知识库管理界面以及与 RAG 后端的通信接口。

### 2. 多语言 (i18n) 修改规范
**核心原则：翻译文件与页面目录一一对应。**

*   **Chat 模块**: `locales/{lang}/chat.ts`
*   **Workflow 模块**: `locales/{lang}/workflow.ts`
*   **Writer 模块**: `locales/{lang}/writer.ts`
*   **公共/设置**: `locales/{lang}/common.ts`

### 3. API 调用与服务
所有涉及网络请求或模型调用的逻辑已统一至 `src/api/`：

*   **通用 LLM 调用**: 使用 `src/api/gemini.ts` (支持多模型切换)。
*   **写作专用**: 使用 `src/api/writer.ts` (处理复杂的 Prompt 和流式解析)。
*   **知识库检索**: 使用 `src/api/rag/` 下的模块。
*   **认证逻辑**: 使用 `src/api/auth.ts`。
*   **本地状态/配置**: 使用 `src/services/` (如 `configService`, `debugService`, `chatHistoryService`)。

---

## 🎨 样式与主题 (Styling & Themes)

本项目使用 Tailwind CSS 进行全局样式管理，但对于 **智能写作 (Smart Writer)** 模块，为了支持“所见即所得”的文档排版（如论文模式、报告模式），采用了独立的 CSS 文件管理主题。

### 如何新增写作主题 (Add a New Writer Theme)

1.  **创建样式文件**：
    在 `src/style/` 目录下新建 CSS 文件（例如 `theme-custom.css`）。必须使用一个唯一的 Class 类名包裹所有样式，以确保样式隔离。

    ```css
    /* src/style/theme-custom.css */
    
    .theme-custom {
      font-family: 'Georgia', serif;
      padding: 4rem;
      background-color: #fff;
      color: #1a1a1a;
    }
    
    .theme-custom h1 {
      border-bottom: 2px solid #333;
      text-align: center;
    }
    
    /* 适配暗色模式 (可选) */
    .dark .theme-custom {
      background-color: #1e1e1e;
      color: #e5e5e5;
    }
    ```

2.  **全局注册**：
    在 `src/App.tsx` 文件顶部引入该样式文件。

    ```tsx
    // src/App.tsx
    import './style/markdown-base.css';
    import './style/theme-lab.css';
    import './style/theme-custom.css'; // <-- 新增
    ```

3.  **UI 菜单注册**：
    在 `src/pages/edit/WriterPage.tsx` 中，找到 `themeMenuRef` 相关的下拉菜单代码，添加新选项。

    ```tsx
    // src/pages/edit/WriterPage.tsx
    <button 
      onClick={() => { setCurrentTheme('theme-custom'); setIsThemeMenuOpen(false); }}
      className="..."
    >
      自定义主题 (Custom)
    </button>
    ```

4.  **多语言配置 (可选)**：
    如需国际化支持，请在 `locales/{lang}/writer.ts` 中添加对应的翻译 Key。

### 如何删除主题 (Remove a Theme)

1.  在 `src/pages/edit/WriterPage.tsx` 中删除对应的 `<button>` 选项。
2.  在 `src/App.tsx` 中删除对应的 `import` 语句。
3.  删除 `src/style/` 目录下的 `.css` 源文件。

---

## 🔐 登录与认证 (Login & Authentication)

系统实现了自适应的登录流程，根据后端服务状态自动切换模式：

1.  **启动检查**：`App.tsx` 加载时调用 `authService.checkBackendHealth()`。
2.  **路由守卫**：未认证状态下强制跳转 `LoginPage`。
3.  **双模式登录**：
    *   **服务器模式 (Server Mode)**：检测到 RAG 后端在线时启用。
    *   **单机模式 (Local Mode)**：RAG 后端离线时启用。使用浏览器本地存储 (LocalStorage) 进行验证。

---

## 🛠️ 调试工具 (Dev Workbench)

全新的调试抽屉支持**动态状态注册 (Dynamic State Registry)**，允许开发者在不修改 UI 代码的情况下查看任意模块的运行时数据。

*   **启用方式**：在 `.env` 中设置 `VITE_APP_ENV=development`。
*   **访问入口**：点击屏幕右下角的 🐞 (Bug) 图标。

### 功能模块

1.  **State Inspector (状态检视器)**
    *   **可视化的 JSON 查看器**，用于检查系统当前的 snapshot 状态。
    *   数据按 `Category` 自动分组（如 System, Workflow, RAG）。
    *   **System**: 后端连接状态、环境配置。
    *   **Workflow**: 当前画布步骤、输入数据、执行日志。
    *   **RAG**: 最近一次检索的 Query 参数及返回结果。

2.  **Event Stream (事件流)**
    *   **时序日志**，用于追踪 API 请求、工具调用序列。
    *   记录 Source (来源), Action (动作), Payload (载荷)。

### 💻 开发者指南：如何添加调试数据

在代码任意位置导入 `debugService` 即可使用。

**1. 注册状态 (State Registry)**
适用于需要持续观察的对象或状态（如组件 State、API 响应结果）。

```typescript
import { debugService } from 'src/services/debugService';

// 注册或更新一个状态块
debugService.registerState(
  'rag.search_result',           // Key (唯一标识)
  { query: 'test', hits: [] },   // Data (任意 JSON)
  { 
    title: 'Last Search Result', // UI 显示标题
    category: 'RAG'              // 分组名称
  }
);
```

**2. 记录事件 (Event Log)**
适用于一次性的动作或请求记录。

```typescript
// 记录一条日志
debugService.log('Chat', 'SendMessage', { text: 'Hello', model: 'gpt-4' });
```

---

## 🚀 快速开始

1.  **环境配置 (.env)**：
    ```ini
    # 运行环境配置 (development | production)
    # development: 启用右下角调试抽屉 (Debug Drawer) 和详细日志
    VITE_APP_ENV=development

    # RAG 后端 API 地址 (必须)
    # Python 后端服务的访问地址，用于文件上传和知识检索
    VITE_RAG_API_BASE=http://127.0.0.1:8900
    
    # 默认语言设置 (可选, zh | en)
    # 设置应用启动时的默认语言，默认为 zh (中文)
    VITE_APP_DEFAULT_LANG=zh
    
    # 认证模式配置 (可选, standalone | multiuser)
    # standalone: 强制单机模式，忽略后端认证，使用本地密码 (Local Storage)
    # multiuser:  多用户模式，需要后端数据库支持登录验证
    VITE_APP_MODE=standalone
    ```

2.  **安装与启动**：
    ```bash
    npm install
    npm start
    ```

---

## ❓ 故障排除 (Troubleshooting)

### 遇到 "Error: [403] ..." 或网络错误
Google Gemini API 在某些地区无法直接访问，请确保您的网络环境支持访问 Google 服务。

### 登录界面显示 "Offline / Unreachable"
这表示前端无法连接到 `VITE_RAG_API_BASE` 配置的地址。
1. 检查后端服务是否启动。
2. 打开 **Dev Workbench (调试抽屉)** -> **State Inspector** -> **System** 查看具体的 RAG Backend Address 配置是否正确。
3. 如果仅需本地开发 UI，可继续使用单机模式登录。
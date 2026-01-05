export const workflow = {
  "config.title": "Configuration",
  "config.workflowName": "Workflow Name",
  "config.globalInput": "Global Input",
  "config.readOnly": "Read-only in Demo",
  "config.edit": "Edit JSON",
  "config.view": "Visual View",
  "config.defaultName": "Example Workflow",
  "btn.run": "Run Workflow",
  "btn.running": "Running...",
  
  "toolbox.title": "Toolbox",
  "toolbox.loading": "Loading tools...",
  
  "canvas.title": "Workflow Steps",
  "canvas.subtitle": "Drag items to reorder logic execution.",
  "canvas.clear": "Clear All",
  "canvas.empty.title": "Workflow is empty",
  "canvas.empty.subtitle": "Click tools on the left or ask AI to build it.",
  "canvas.deleteEdge": "Delete connection",

  "upload.title": ".mat/.csv Upload",
  "upload.pickFile": "Please select a .mat or .csv file first.",
  "upload.button": "Upload to backend and write into JSON (.mat / .csv)",
  "upload.uploading": "Uploading...",
  "upload.success": "Upload succeeded: {{filename}} → {{path}}",
  "upload.failure": "Upload failed: {{message}}",
  "upload.choose": "Choose File",
  "upload.noFile": "No file chosen",

  "input.invalidJson": "Invalid JSON syntax.",
  "input.invalidJsonAlert": "Invalid JSON Input",

  "alert.noEntryNodes": "No entry nodes found. Please add at least one node with no incoming edges.",
  "alert.cycleDetected": "Detected a possible cycle or runaway branching; execution was stopped.",
  "alert.toolNotRegistered": "Tool not registered in backend pool: {{toolId}}\nPlease check getAvailableTools() returns this tool.",

  "logs.title": "Execution Logs",
  "logs.empty.title": "Ready to execute",
  "logs.empty.subtitle": "Click \"Run Workflow\" to start.",
  "logs.input": "Input",
  "logs.output": "Output",
  "logs.openChart": "📊 Open DiPCA chart",

  "workflow.help.welcome": "Welcome to Orchestrator",
  "workflow.help.subtitle": "Visual Workflow Builder for MCP Tools",
  "workflow.help.step1.title": "Build",
  "workflow.help.step1.desc": "Click tools in the Toolbox or drag steps to reorder them in the center canvas.",
  "workflow.help.step2.title": "Execute",
  "workflow.help.step2.desc": "Click the purple \"Run Workflow\" button on the left sidebar to execute your logic.",
  "workflow.help.step3.title": "AI Assist",
  "workflow.help.step3.desc": "Use the floating chat button (bottom-right) to ask Gemini to build workflows for you.",
  "workflow.help.getStarted": "Get Started",

  "logs.resize.title": "Drag to resize log panel",
  "toolbox.category.fallback": "Tool"
};

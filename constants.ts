import { MCPTool } from './types';

export const MCP_TOOLS: MCPTool[] = [
  { id: 'matrix.add', name: 'Matrix Addition', description: 'Add two matrices together.', category: 'math' },
  { id: 'matrix.mul', name: 'Matrix Multiplication', description: 'Multiply two matrices.', category: 'math' },
  { id: 'matrix.inv', name: 'Matrix Inversion', description: 'Calculate the inverse of a matrix.', category: 'math' },
  { id: 'data.normalize', name: 'Data Normalization', description: 'Normalize a dataset to 0-1 range.', category: 'data' },
  { id: 'poly.fit', name: 'Polynomial Fit', description: 'Fit a polynomial to data points.', category: 'analysis' },
  { id: 'poly.evaluate', name: 'Polynomial Evaluate', description: 'Evaluate a polynomial at given x.', category: 'analysis' },
  { id: 'error.metrics', name: 'Error Metrics', description: 'Calculate MSE and MAE errors.', category: 'analysis' },
  { id: 'utils.log', name: 'Logger', description: 'Log current state to console.', category: 'utility' },
];

export const DEFAULT_INPUT_JSON = JSON.stringify({
  "matrix_a": [[1, 2], [3, 4]],
  "matrix_b": [[5, 6], [7, 8]],
  "x": [0.0, 0.5, 1.0, 1.5, 2.0],
  "y": [1.1, 1.4, 2.0, 3.1, 4.2]
}, null, 2);

export const GEMINI_SYSTEM_PROMPT = `
You are a workflow assistant for the MCP Workflow Orchestrator.
Your goal is to help the user modify their workflow steps using the provided tools.
When a user asks to "add matrix addition" or "use data normalization", you MUST call the \`record_step\` function.
The \`tool_id\` argument must be one of the valid IDs: 'matrix.add', 'matrix.mul', 'matrix.inv', 'data.normalize', 'poly.fit', 'poly.evaluate', 'error.metrics', 'utils.log'.
If the user wants to clear the workflow, set \`reset\` to true.
Answer the user in a helpful, concise manner.
`;
// src/api/dipca.ts
const BASE = import.meta.env.VITE_DIPCA_API_BASE || 'http://localhost:2370';

export async function dipcaInvoke(tool_id: string, global_input: any, prev_output: any, step_index: number) {
  const resp = await fetch(`${BASE}/invoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tool_id, global_input, prev_output, step_index }),
  });
  if (!resp.ok) throw new Error(await resp.text());
  return await resp.json(); // { tool_id, step_index, output }
}

export function dipcaFileUrl(path: string) {
  return `${BASE}/files?path=${encodeURIComponent(path)}`;
}

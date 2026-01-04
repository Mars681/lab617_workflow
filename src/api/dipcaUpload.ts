// src/api/dipcaUpload.ts
const BASE = import.meta.env.VITE_DIPCA_API_BASE || 'http://127.0.0.1:2370';

export async function uploadMatToBackend(file: File) {
  const fd = new FormData();
  fd.append('file', file);

  const resp = await fetch(`${BASE}/upload`, {
    method: 'POST',
    body: fd,
  });

  if (!resp.ok) {
    throw new Error(await resp.text());
  }
  return await resp.json() as { filename: string; mat_path: string };
}

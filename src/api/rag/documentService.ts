import { fetchWithTimeout, RAG_API_BASE } from './config';
import type { RagFile, RagChunk } from '../../types';

export const fetchFiles = async (projectId: string): Promise<RagFile[]> => {
  const response = await fetchWithTimeout(`${RAG_API_BASE}/documents/files/${projectId}`, {
    method: 'GET',
  });
  if (!response.ok) throw new Error('Failed to fetch files');
  const data = await response.json();
  
  let files: any[] = [];
  // Handle various potential response structures
  if (Array.isArray(data)) {
      files = data;
  } else if (data.data && Array.isArray(data.data)) {
      files = data.data;
  } else if (data.files && Array.isArray(data.files)) {
      files = data.files;
  }

  // Map snake_case from Python backend to camelCase for frontend
  return files.map((f: any) => ({
    id: f.id,
    fileName: f.file_name || f.fileName || f.name || 'Unknown File',
    fileInfo: f.file_info || f.fileInfo || {},
    size: f.size || 0,
    status: f.status || 'unknown',
    createAt: f.create_at || f.createAt,
    stats: f.stats
  }));
};

export const uploadFiles = async (projectId: string, files: File[]): Promise<void> => {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('files', file);
  });

  const response = await fetchWithTimeout(`${RAG_API_BASE}/documents/upload/${projectId}`, {
    method: 'POST',
    body: formData,
    // Note: Do NOT set Content-Type header when sending FormData, fetch sets it automatically with boundary
  });

  if (!response.ok) {
     const text = await response.text();
     throw new Error(text || 'Upload failed');
  }
};

export const deleteFile = async (fileId: string): Promise<void> => {
  const response = await fetchWithTimeout(`${RAG_API_BASE}/documents/files/${fileId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete file');
};

export const fetchChunks = async (projectId: string): Promise<RagChunk[]> => {
  const response = await fetchWithTimeout(`${RAG_API_BASE}/documents/chunks/${projectId}`, {
    method: 'GET',
  });
  if (!response.ok) throw new Error('Failed to fetch chunks');
  const data = await response.json();
  
  const chunks = Array.isArray(data) ? data : (data.data || []);
  
  // Map snake_case for chunks as well
  return chunks.map((c: any) => ({
      id: c.id,
      name: c.name || c.id,
      content: c.content || c.text || '',
      fileName: c.file_name || c.fileName || 'Unknown',
      size: c.size || (c.content ? c.content.length : 0),
      createAt: c.create_at || c.createAt,
      updateAt: c.update_at || c.updateAt
  }));
};

export const addChunk = async (projectId: string, docName: string, docId: string, text: string): Promise<void> => {
  const response = await fetchWithTimeout(`${RAG_API_BASE}/documents/chunks_add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project_id: projectId,
      doc_name: docName,
      doc_id: docId,
      text: text
    })
  });
  if (!response.ok) throw new Error('Failed to add chunk');
};

export const editChunk = async (docName: string, chunkId: string, text: string): Promise<void> => {
  const response = await fetchWithTimeout(`${RAG_API_BASE}/documents/chunks_edit`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      doc_name: docName,
      chunk_id: chunkId,
      text: text
    })
  });
  if (!response.ok) throw new Error('Failed to edit chunk');
};

export const deleteChunk = async (chunkId: string, chunkName: string): Promise<void> => {
  const response = await fetchWithTimeout(`${RAG_API_BASE}/documents/chunks_delete`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chunk_id: chunkId,
      chunk_name: chunkName
    })
  });
  if (!response.ok) throw new Error('Failed to delete chunk');
};

export const rebuildChunks = async (projectId: string): Promise<void> => {
  const response = await fetchWithTimeout(`${RAG_API_BASE}/documents/rebuild/${projectId}`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to rebuild chunks');
};

export const getExportUrl = (projectId: string) => {
  return `${RAG_API_BASE}/documents/chunks_export/${projectId}`;
};
import { fetchWithTimeout, RAG_API_BASE } from './config';
import type { Project } from '../../types';

/**
 * Fetches available Knowledge Base projects.
 */
export const fetchProjects = async (): Promise<Project[] | null> => {
  try {
    const response = await fetchWithTimeout(`${RAG_API_BASE}/projects/`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      timeout: 3000 
    });

    if (!response.ok) throw new Error('Failed to fetch projects');
    return await response.json();
  } catch (error) {
    console.warn("RAG Backend unavailable or unreachable, switching to local mode.");
    return null;
  }
};

/**
 * Creates a new Knowledge Base project.
 */
export const createProject = async (name: string, description: string): Promise<Project> => {
  const response = await fetchWithTimeout(`${RAG_API_BASE}/projects/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Failed to create project' }));
    throw new Error(err.detail || 'Failed to create project');
  }
  return await response.json();
};

/**
 * Deletes a Knowledge Base project.
 */
export const deleteProject = async (projectId: string): Promise<void> => {
  const response = await fetchWithTimeout(`${RAG_API_BASE}/projects/${projectId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete project');
};
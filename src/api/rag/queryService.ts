import { fetchWithTimeout, RAG_API_BASE } from './config';
import type { RagResult } from '../../types';
import { debugService } from '../../services/debugService';

/**
 * Queries the Knowledge Base for context relevant to the given query.
 */
export const queryKnowledgeBase = async (query: string, projectIds: string[]): Promise<string> => {
  if (!projectIds || projectIds.length === 0) return "";
  
  const payload = {
    query: query,
    project_ids: projectIds,
    retrieval_mode: "hybrid",
    top_k: 5,
    retrieval_weight: 0.5,
    merge_results: true,
    threshold: 0.0
  };

  debugService.log('RAG', 'Query', payload);

  try {
    const response = await fetchWithTimeout(`${RAG_API_BASE}/query/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
      timeout: 10000 
    });

    if (!response.ok) throw new Error('Failed to query knowledge base');
    
    const data = await response.json();
    
    // Register the latest RAG retrieval state for inspection
    debugService.registerState('rag.latest_query', {
        query: query,
        projectIds: projectIds,
        resultCount: data.results?.length || 0,
        results: data.results
    }, { title: 'Latest RAG Retrieval', category: 'RAG' });
    
    if (data.results && Array.isArray(data.results)) {
       const text = data.results
         .map((r: RagResult) => r.content)
         .filter((c: any) => c && typeof c === 'string' && c.trim().length > 0)
         .join("\n\n---\n\n");
       
       const snippetCount = data.results.length;
       console.log(`KB Retrieval: Found ${snippetCount} related snippets`);
       debugService.log('RAG', 'Success', { snippets: snippetCount, firstSnippetPreview: data.results[0]?.content?.slice(0, 50) });
       return text || "";
    }
    debugService.log('RAG', 'Empty', { message: 'No results found' });
    return "";
  } catch (error: any) {
    console.warn("RAG Query failed, skipping KB context:", error);
    debugService.log('RAG', 'Error', { error: error.message });
    return "";
  }
};
import OpenAI from 'openai';
import type { Outline } from '../types';
import { getAppConfig, getProviderById } from '../services/configService';
import { queryKnowledgeBase } from './rag';
import { debugService } from '../services/debugService';

// --- Dynamic LLM Client ---
const getLLMContext = (providerId?: string) => {
  const config = getAppConfig();
  const targetId = providerId || config.defaults.writerProviderId;
  const provider = getProviderById(config, targetId);
  
  if (!provider) {
      throw new Error("Writer Model Provider not found. Please configure it in Settings.");
  }
  
  let baseURL = provider.baseUrl;
  // Apply defaults if empty
  if (!baseURL) {
      if (provider.type === 'openai') baseURL = 'https://api.openai.com/v1';
      else if (provider.type === 'ollama') baseURL = 'http://localhost:11434/v1';
  }

  const client = new OpenAI({
    baseURL: baseURL,
    apiKey: provider.apiKey || 'ollama', // Ollama needs non-empty key usually for SDK to not complain
    dangerouslyAllowBrowser: true 
  });

  return { client, model: provider.selectedModel, providerName: provider.name };
};

const cleanJsonOutput = (text: string): string => {
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  
  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.substring(start, end + 1);
  }

  cleaned = cleaned.replace(/```json/g, '').replace(/```/g, '');
  return cleaned.trim();
};

const streamCompletion = async (
  stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>,
  onChunk: (chunk: string) => void
): Promise<string> => {
  let fullContent = '';
  let buffer = '';
  let isThinking = false;

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || '';
    if (!content) continue;

    buffer += content;

    while (true) {
      if (isThinking) {
        const endIdx = buffer.indexOf('</think>');
        if (endIdx !== -1) {
          isThinking = false;
          buffer = buffer.substring(endIdx + 8); 
        } else {
          break;
        }
      } else {
        const startIdx = buffer.indexOf('<think>');
        if (startIdx !== -1) {
          const validPart = buffer.substring(0, startIdx);
          if (validPart) {
            fullContent += validPart;
            onChunk(validPart);
          }
          isThinking = true;
          buffer = buffer.substring(startIdx + 7); 
        } else {
          const lastOpen = buffer.lastIndexOf('<');
          if (lastOpen !== -1 && buffer.length - lastOpen < 8) {
             const safePart = buffer.substring(0, lastOpen);
             if (safePart) {
                fullContent += safePart;
                onChunk(safePart);
             }
             buffer = buffer.substring(lastOpen);
             break; 
          } else {
             fullContent += buffer;
             onChunk(buffer);
             buffer = '';
             break;
          }
        }
      }
    }
  }

  if (!isThinking && buffer) {
    fullContent += buffer;
    onChunk(buffer);
  }

  return fullContent;
};

// --- LLM Services ---

export const generateCompletion = async (
  messages: { role: string; content: string }[],
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
  providerId?: string
): Promise<string> => {
  try {
    const ctx = getLLMContext(providerId);
    
    debugService.log('Writer', 'Generation Request', {
        provider: ctx.providerName,
        model: ctx.model,
        messagesCount: messages.length,
        lastMessage: messages[messages.length - 1].content.slice(0, 100) + '...'
    });

    const apiMessages = messages.map(m => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content
    }));

    const stream = await ctx.client.chat.completions.create({
      model: ctx.model,
      messages: apiMessages,
      stream: true,
      temperature: 0.5
    }, { signal }); 

    return await streamCompletion(stream, onChunk);

  } catch (error: any) {
    if (error.name === 'AbortError' || error.message === 'The user aborted a request.') {
      debugService.log('Writer', 'Aborted', {});
      throw new Error("Generation aborted by user");
    }
    console.error("LLM Generation Error:", error);
    debugService.log('Writer', 'Error', { error: error.message });
    throw error;
  }
};

export const generateOutline = async (
  topic: string, 
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
  providerId?: string
): Promise<Outline | null> => {
  const systemPrompt = `You are a professional Outline Generation Expert.
Your task is to create a structured outline for a document based on the user's topic and instructions.

### Requirements:
1. **Output Format**: Pure JSON object only. NO Markdown formatting, NO explanations.
2. **Language**: Use the same language as the user's input (Chinese or English).
3. **Structure**:
   - \`title\`: The main title of the document.
   - \`chapters\`: An array of chapters.
4. **Chapter Details**:
   - \`title\`: The chapter title.
   - \`summary\`: A detailed breakdown of the chapter. MUST include sub-headings (1.1, 1.2) and key points to be covered.

### JSON Schema:
{
  "title": "Main Title",
  "chapters": [
    {
      "title": "Chapter Title",
      "summary": "- 1.1 Sub-heading: Description...\\n- 1.2 Sub-heading: Description..."
    }
  ]
}
Output the JSON string directly. Start with {.`;

  try {
    const ctx = getLLMContext(providerId);
    
    debugService.log('Writer', 'Outline Request', {
        topic: topic,
        model: ctx.model
    });

    const stream = await ctx.client.chat.completions.create({
      model: ctx.model, 
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: topic }
      ],
      stream: true,
    }, { signal });

    const fullText = await streamCompletion(stream, onChunk);
    
    if (!fullText) return null;
    
    const cleanedText = cleanJsonOutput(fullText);
    const parsed = JSON.parse(cleanedText);
    
    if (Array.isArray(parsed.chapters)) {
        return {
            title: parsed.title || "Untitled Document",
            chapters: parsed.chapters
        };
    }
    return null;
  } catch (e) {
    console.error("Failed to generate or parse outline JSON", e);
    debugService.log('Writer', 'Outline Error', { error: String(e) });
    return null;
  }
};

export const refineOutline = async (
  currentOutline: Outline, 
  instruction: string, 
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
  providerId?: string
): Promise<Outline> => {
    const systemPrompt = `You are an expert Outline Refinement Assistant.
Your task is to modify an existing document outline based on the user's instructions.

### Input Data
1. **Existing Outline**: JSON format.
2. **User Instruction**: How to modify the outline (e.g., "Add a chapter about...", "Remove the last section", "Change title to...").

### Output Requirements
1. **Format**: Pure JSON only. Matches the structure of the input outline.
2. **Logic**: Apply the user's request intelligently.
3. **No Chatter**: Do not explain your changes. Just output the JSON.

### JSON Schema:
{
  "title": "Main Title",
  "chapters": [
    { "title": "...", "summary": "..." }
  ]
}
`;

    const userPrompt = `
[Existing Outline]:
${JSON.stringify(currentOutline, null, 2)}

[Instruction]:
${instruction}

Output the modified JSON:
`;

  try {
    const ctx = getLLMContext(providerId);
    
    debugService.log('Writer', 'Refine Outline Request', {
        instruction,
        currentTitle: currentOutline.title
    });

    const stream = await ctx.client.chat.completions.create({
      model: ctx.model, 
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      stream: true,
    }, { signal });

    const fullText = await streamCompletion(stream, onChunk);
    const cleanedText = cleanJsonOutput(fullText);
    const parsed = JSON.parse(cleanedText);
    
    if (Array.isArray(parsed.chapters)) {
        return {
            title: parsed.title || currentOutline.title,
            chapters: parsed.chapters
        };
    }
    throw new Error("Invalid structure");
  } catch (e) {
    console.error("Failed to refine outline", e);
    debugService.log('Writer', 'Refine Error', { error: String(e) });
    throw e;
  }
};

export const refineText = async (
  originalText: string,
  instruction: string,
  projectIds: string[],
  contextPrefix: string,
  contextSuffix: string,
  globalContext: string,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
  mode: 'text' | 'outline' = 'text',
  providerId?: string
): Promise<void> => {
    
  if (mode === 'outline') {
      return;
  }

  let kbContext = "";
  if (projectIds && projectIds.length > 0) {
      try {
          const query = `${instruction} ${originalText.slice(0, 100)}`;
          // This call is already instrumented in queryKnowledgeBase
          kbContext = await queryKnowledgeBase(query, projectIds);
      } catch (e) {
          console.warn("Refinement RAG failed", e);
      }
  }

  const systemPrompt = `You are an expert editor and writing assistant.
Your task is to modify, rewrite, or expand the selected text based on user instructions.

### Input Context
- **Selected Text**: The specific text the user wants to change (might be empty if inserting).
- **Instruction**: What the user wants to do.
- **Preceding Text**: Context before the selection.
- **Following Text**: Context after the selection.
- **Global Constraints**: Style/Tone requirements.
- **Knowledge Base**: Verified facts to use.

### Output Rules
1. **Output ONLY the replacement text**. Do not output the context prefix/suffix unless necessary for flow.
2. **Format**: Markdown.
3. **Style**: Match the tone of the surrounding text or the global constraints.
4. **Latex**: Use $...$ for inline and $$...$$ for block math.
`;

  const userPrompt = `
[Global Constraints]:
${globalContext || "Professional, clear, academic."}

[Knowledge Base]:
${kbContext || "None"}

[Context Before]:
...${contextPrefix.slice(-300)}

[Selected Text to Modify]:
${originalText}

[Context After]:
${contextSuffix.slice(0, 300)}...

[Instruction]:
${instruction}

Please provide the rewritten text (or new text) below:
`;

  await generateCompletion(
    [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
    onChunk,
    signal,
    providerId
  );
};
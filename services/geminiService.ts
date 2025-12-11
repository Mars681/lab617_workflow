import { GoogleGenAI, FunctionDeclaration, Type, Tool } from "@google/genai";
import { GEMINI_SYSTEM_PROMPT, MCP_TOOLS } from '../constants';

const API_KEY = process.env.API_KEY || ''; // In a real app, ensure this is set

let aiClient: GoogleGenAI | null = null;

const getClient = () => {
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: API_KEY });
  }
  return aiClient;
};

// Define the tool available to Gemini
const recordStepTool: FunctionDeclaration = {
  name: 'record_step',
  description: 'Record a workflow step by adding a tool ID to the configuration.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      tool_id: {
        type: Type.STRING,
        description: `The ID of the tool to add. Valid options: ${MCP_TOOLS.map(t => t.id).join(', ')}`,
      },
      reset: {
        type: Type.BOOLEAN,
        description: 'Whether to clear existing steps before adding this one.',
      },
    },
    required: ['tool_id'],
  },
};

const tools: Tool[] = [{ functionDeclarations: [recordStepTool] }];

export const sendMessageToGemini = async (
  history: { role: string; parts: { text: string }[] }[],
  message: string,
  onToolCall: (toolId: string, reset: boolean) => Promise<{ ok: boolean; message: string }>
): Promise<string> => {
  const client = getClient();
  
  // Note: For a real chat session with history, we should use chats.create
  // However, for this stateless-ish helper, we'll demonstrate using generateContent 
  // with a constructed history or just a simple turn for brevity in this specific arch.
  // To keep it simple and robust for this demo, we'll use a fresh chat session each time 
  // but pre-load history if needed. 
  
  const chat = client.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: GEMINI_SYSTEM_PROMPT,
      tools: tools,
    },
    history: history.map(h => ({
      role: h.role,
      parts: h.parts
    }))
  });

  try {
    const result = await chat.sendMessage({ message });
    
    // Check for function calls
    const calls = result.candidates?.[0]?.content?.parts?.filter(p => p.functionCall);
    
    let finalResponseText = result.text || "";

    if (calls && calls.length > 0) {
      const toolResponses = [];
      
      for (const call of calls) {
        if (call.functionCall && call.functionCall.name === 'record_step') {
           const args = call.functionCall.args as any;
           const toolId = args.tool_id;
           const reset = !!args.reset;

           // Execute the tool locally (update React state)
           const toolResult = await onToolCall(toolId, reset);
           
           toolResponses.push({
             functionResponse: {
               name: 'record_step',
               id: call.functionCall.id, 
               response: { result: toolResult }
             }
           });
        }
      }

      // Send tool results back to Gemini to get the final natural language response
      if (toolResponses.length > 0) {
         const followup = await chat.sendMessage(toolResponses);
         finalResponseText = followup.text || "Updated the workflow.";
      }
    }
    
    return finalResponseText;

  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I'm sorry, I encountered an error connecting to the AI assistant. Please check your API key.";
  }
};
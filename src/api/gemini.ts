import { getAppConfig, getProviderById } from "../services/configService";
import { getAvailableTools } from "./workflow";
import { TOOL_DEFINITIONS } from "../lib/workflow/tools";
import { debugService } from "../services/debugService";

/**
 * All providers (including provider.type === 'gemini') now use OpenAI-compatible protocol:
 * POST {baseUrl}/v1/chat/completions
 *
 * Tool calling uses strict OpenAI tools schema:
 *   tools: [{ type: "function", function: { name, description, parameters } }]
 *
 * This file exports:
 *  - streamWorkflowChat  (for ChatAssistant.tsx)
 *  - sendMessageToGemini (kept for compatibility)
 *  - sendSimpleChat
 *  - sendSimpleChatStream
 */

// --------------------------
// OpenAI-compatible types
// --------------------------

type OpenAIMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | {
      role: "assistant";
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: "function";
        function: { name: string; arguments: string };
      }>;
    }
  | { role: "tool"; tool_call_id: string; content: string };

type OpenAITool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters: Record<string, any>; // JSON Schema
  };
};

type OpenAIToolChoice =
  | "auto"
  | "none"
  | { type: "function"; function: { name: string } };

type OpenAIChatCompletionsResponse = {
  choices?: Array<{
    message?: {
      role?: string;
      content?: string | null;
      tool_calls?: Array<{
        id: string;
        type: "function";
        function: { name: string; arguments: string };
      }>;
    };
    finish_reason?: string;
  }>;
};

// --------------------------
// Helpers
// --------------------------

const normalizeBaseUrl = (baseUrl: string) => baseUrl.replace(/\/+$/, "");

const ensureV1 = (baseUrl: string) => {
  const url = normalizeBaseUrl(baseUrl);
  if (url.endsWith("/v1")) return url;
  if (url.includes("/v1/")) return url;
  return `${url}/v1`;
};

const buildHeaders = (apiKey?: string) => {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
  return headers;
};

const safeJsonParse = <T,>(s: string): T | null => {
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
};

const toOpenAIRole = (role: string): "system" | "user" | "assistant" => {
  if (role === "model") return "assistant";
  if (role === "assistant") return "assistant";
  if (role === "system") return "system";
  return "user";
};

const mapHistoryToOpenAIMessages = (
  history: { role: string; parts: { text: string }[] }[]
): OpenAIMessage[] => {
  const out: OpenAIMessage[] = [];
  for (const h of history) {
    const role = toOpenAIRole(h.role);
    const text = (h.parts?.[0]?.text ?? "").toString();
    if (!text.trim()) continue;

    if (role === "system") out.push({ role: "system", content: text });
    else if (role === "assistant") out.push({ role: "assistant", content: text });
    else out.push({ role: "user", content: text });
  }
  return out;
};

// --------------------------
// Provider context
// --------------------------

type ProviderCtx = {
  ok: boolean;
  providerType: string;
  baseUrl: string; // includes /v1
  apiKey?: string;
  model: string;
};

const getOpenAIProtocolClient = (overrideProviderId?: string): ProviderCtx => {
  const config = getAppConfig();

  const providerId = overrideProviderId || config.defaults.workflowProviderId;
  let provider = getProviderById(config, providerId);

  if (!provider) {
    provider =
      config.providers.find(
        (p) => p.apiKey && (p.type === "gemini" || p.type === "openai" || p.type === "ollama")
      ) || null;
  }

  if (!provider) return { ok: false, providerType: "unknown", baseUrl: "", model: "" };

  let baseUrl = provider.baseUrl || "";

  if (!baseUrl) {
    if (provider.type === "openai") baseUrl = "https://api.openai.com";
    else if (provider.type === "ollama") baseUrl = "http://localhost:11434";
    else {
      // gemini type but no baseUrl
      return {
        ok: false,
        providerType: provider.type,
        baseUrl: "",
        apiKey: provider.apiKey,
        model: provider.selectedModel || "",
      };
    }
  }

  baseUrl = normalizeBaseUrl(baseUrl);

  // ollama convenience
  if (provider.type === "ollama" && !baseUrl.includes("/v1") && baseUrl.endsWith(":11434")) {
    baseUrl = `${baseUrl}/v1`;
  } else {
    baseUrl = ensureV1(baseUrl);
  }

  const model = provider.selectedModel || (provider.type === "ollama" ? "llama3" : "");

  return {
    ok: !!(baseUrl && model),
    providerType: provider.type,
    baseUrl,
    apiKey: provider.apiKey,
    model,
  };
};

// --------------------------
// System prompt
// --------------------------

const getWorkflowSystemPrompt = async () => {
  const availableTools = await getAvailableTools();
  const toolsDescription = availableTools
    .map((t) => `- ID: ${t.id}\n  Name: ${t.name}\n  Description: ${t.description}`)
    .join("\n");

  return `
You are a workflow assistant for the MCP Workflow Orchestrator.
Your goal is to help the user modify their workflow steps using the provided tools.

Available Tools:
${toolsDescription}

When a user asks to "add matrix addition" or "use data normalization" (or equivalent in other languages), you MUST call the \`record_step\` function.
The \`tool_id\` argument must be one of the valid IDs listed above.
If the user wants to clear the workflow, set \`reset\` to true.
Answer the user in a helpful, concise manner in the same language they used.
`;
};

// --------------------------
// Tool definition (OpenAI tools schema)
// --------------------------

const validToolIds = TOOL_DEFINITIONS.map((t) => t.id);

const recordStepTool: OpenAITool = {
  type: "function",
  function: {
    name: "record_step",
    description: "Record a workflow step by adding a tool ID to the configuration.",
    parameters: {
      type: "object",
      properties: {
        tool_id: {
          type: "string",
          enum: validToolIds, // ✅ 改动1：强约束 tool_id 只能是合法ID
          description: `The ID of the tool to add. Valid options: ${validToolIds.join(", ")}`,
        },
        reset: {
          type: "boolean",
          description: "Whether to clear existing steps before adding this one.",
        },
      },
      required: ["tool_id"],
      additionalProperties: false,
    },
  },
};

const workflowTools: OpenAITool[] = [recordStepTool];

// --------------------------
// Core request helpers
// --------------------------

const postChatCompletions = async (
  ctx: ProviderCtx,
  payload: Record<string, any>,
  signal?: AbortSignal
): Promise<OpenAIChatCompletionsResponse> => {
  const res = await fetch(`${ctx.baseUrl}/chat/completions`, {
    method: "POST",
    headers: buildHeaders(ctx.apiKey),
    body: JSON.stringify(payload),
    signal,
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`API Error: ${res.status} - ${text}`);

  const json = safeJsonParse<OpenAIChatCompletionsResponse>(text);
  if (!json) throw new Error("API Error: invalid JSON response");
  return json;
};

const streamChatCompletions = async (
  ctx: ProviderCtx,
  payload: Record<string, any>,
  onDelta: (delta: any) => void,
  signal?: AbortSignal
): Promise<void> => {
  const res = await fetch(`${ctx.baseUrl}/chat/completions`, {
    method: "POST",
    headers: buildHeaders(ctx.apiKey),
    body: JSON.stringify({ ...payload, stream: true }),
    signal,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API Error: ${res.status} - ${text}`);
  }
  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (signal?.aborted) throw new Error("Aborted");

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data: ")) continue;

      const dataStr = trimmed.slice(6);
      if (dataStr === "[DONE]") continue;

      const json = safeJsonParse<any>(dataStr);
      if (!json) continue;

      const delta = json.choices?.[0]?.delta;
      if (delta) onDelta(delta);
    }
  }
};

// --------------------------
// Export: streamWorkflowChat (what ChatAssistant.tsx expects)
// --------------------------

/**
 * Stream workflow chat with OpenAI protocol + tool calling.
 * - streams assistant content via onChunk
 * - if tool_calls appear, executes onToolCall, then does a second (non-stream) call to get final answer
 */
export const streamWorkflowChat = async (
  history: { role: string; parts: { text: string }[] }[],
  message: string,
  onChunk: (chunk: string) => void,
  onToolCall: (toolId: string, reset: boolean) => Promise<{ ok: boolean; message: string }>,
  providerId?: string,
  signal?: AbortSignal
): Promise<void> => {
  const ctx = getOpenAIProtocolClient(providerId);
  if (!ctx.ok) throw new Error("Configuration Error: Provider missing baseUrl/model.");

  const systemPrompt = await getWorkflowSystemPrompt();

  debugService.log("Workflow", "LLM Stream Request", {
    providerType: ctx.providerType,
    model: ctx.model,
    message,
    historyLength: history.length,
    tools: ["record_step"],
  });

  const messages: OpenAIMessage[] = [
    { role: "system", content: systemPrompt },
    ...mapHistoryToOpenAIMessages(history),
    { role: "user", content: message },
  ];

  // accumulate tool calls (streaming arguments may arrive in fragments)
  const toolCalls: Record<number, { id: string; name: string; args: string }> = {};

  let reasoningOpen = false;

  try {
    await streamChatCompletions(
      ctx,
      {
        model: ctx.model,
        messages,
        tools: workflowTools,
        tool_choice: "auto" as OpenAIToolChoice,
      },
      (delta) => {
        const content = delta.content || "";
        const reasoning = delta.reasoning_content || "";

        // optional reasoning mapping to <think> for UI
        if (reasoning) {
          if (!reasoningOpen) {
            onChunk("<think>");
            reasoningOpen = true;
          }
          onChunk(reasoning);
        }

        if (content) {
          if (reasoningOpen) {
            onChunk("</think>");
            reasoningOpen = false;
          }
          onChunk(content);
        }

        // tool calls
        const dToolCalls = delta.tool_calls as any[] | undefined;
        if (dToolCalls?.length) {
          for (const tc of dToolCalls) {
            const idx = tc.index ?? 0;
            if (!toolCalls[idx]) {
              toolCalls[idx] = {
                id: tc.id,
                name: tc.function?.name || "",
                args: "",
              };
            }
            if (tc.function?.name) toolCalls[idx].name = tc.function.name;
            if (tc.function?.arguments) toolCalls[idx].args += tc.function.arguments;
          }
        }
      },
      signal
    );

    if (reasoningOpen) {
      onChunk("</think>");
      reasoningOpen = false;
    }

    // If no tool calls, streaming already produced answer
    const calls = Object.values(toolCalls).filter((c) => c.name);
    if (calls.length === 0) return;

    // If there are tool calls, execute and do follow-up (non-stream) to get final response
    const followMessages: OpenAIMessage[] = [
      ...messages,
      {
        role: "assistant",
        content: null,
        tool_calls: calls.map((c) => ({
          id: c.id,
          type: "function",
          function: { name: c.name, arguments: c.args },
        })),
      },
    ];

    for (const c of calls) {
      if (c.name !== "record_step") continue;

      const args = safeJsonParse<{ tool_id?: string; reset?: boolean }>(c.args) || {};
      const toolId = args.tool_id || "";
      const reset = !!args.reset;

      const toolResult = await onToolCall(toolId, reset);

      followMessages.push({
        role: "tool",
        tool_call_id: c.id,
        content: JSON.stringify({ result: toolResult }),
      });
    }

    const second = await postChatCompletions(ctx, {
      model: ctx.model,
      messages: followMessages,
      tools: workflowTools,
      stream: false,
    });

    const finalText = (second.choices?.[0]?.message?.content ?? "Updated the workflow.") as string;

    // ensure final text appears
    if (finalText?.trim()) onChunk(finalText);

  } catch (error: any) {
    debugService.log("Workflow", "LLM Stream Error", { error: error.message });
    // IMPORTANT: do not onChunk the raw error text (avoid polluting chat)
    throw error;
  }
};

// --------------------------
// Export: Workflow chat (non-stream) - kept old name
// --------------------------

export const sendMessageToGemini = async (
  history: { role: string; parts: { text: string }[] }[],
  message: string,
  onToolCall: (toolId: string, reset: boolean) => Promise<{ ok: boolean; message: string }>,
  providerId?: string
): Promise<string> => {
  const ctx = getOpenAIProtocolClient(providerId);

  if (!ctx.ok) {
    return "⚠️ Configuration Error: Provider missing baseUrl/model.\n\n请到 **Settings > Models** 给当前 workflow provider 设置一个 OpenAI-compatible 的 baseUrl（通常以 /v1 结尾），并选择 model。";
  }

  const systemPrompt = await getWorkflowSystemPrompt();

  debugService.log("Workflow", "LLM Request", {
    providerType: ctx.providerType,
    model: ctx.model,
    message,
    historyLength: history.length,
    tools: ["record_step"],
  });

  const messages: OpenAIMessage[] = [
    { role: "system", content: systemPrompt },
    ...mapHistoryToOpenAIMessages(history),
    { role: "user", content: message },
  ];

  try {
    const first = await postChatCompletions(ctx, {
      model: ctx.model,
      messages,
      tools: workflowTools,
      tool_choice: "auto" as OpenAIToolChoice,
      stream: false,
    });

    const assistantMsg = first.choices?.[0]?.message;
    const toolCalls = assistantMsg?.tool_calls || [];
    let finalText = (assistantMsg?.content ?? "")?.toString() || "";

    if (toolCalls.length > 0) {
      const followMessages: OpenAIMessage[] = [
        ...messages,
        {
          role: "assistant",
          content: assistantMsg?.content ?? null,
          tool_calls: toolCalls.map((c) => ({
            id: c.id,
            type: "function",
            function: { name: c.function.name, arguments: c.function.arguments },
          })),
        },
      ];

      for (const call of toolCalls) {
        if (call.type !== "function") continue;
        if (call.function.name !== "record_step") continue;

        const args =
          safeJsonParse<{ tool_id?: string; reset?: boolean }>(call.function.arguments) || {};

        const toolId = args.tool_id || "";
        const reset = !!args.reset;

        const toolResult = await onToolCall(toolId, reset);

        followMessages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify({ result: toolResult }),
        });
      }

      const second = await postChatCompletions(ctx, {
        model: ctx.model,
        messages: followMessages,
        tools: workflowTools,
        stream: false,
      });

      finalText =
        ((second.choices?.[0]?.message?.content ?? "Updated the workflow.") as string) || "";
    }

    debugService.log("Workflow", "LLM Response", { text: finalText });
    return finalText;

  } catch (error: any) {
    debugService.log("Workflow", "LLM Error", { error: error.message });
    // do not return raw error as assistant content
    return "";
  }
};

// --------------------------
// Export: simple chat (non-stream)
// --------------------------

export const sendSimpleChat = async (
  history: { role: string; parts: { text: string }[] }[],
  message: string,
  providerId?: string
): Promise<string> => {
  const config = getAppConfig();
  const targetId = providerId || config.defaults.chatProviderId;
  const provider = getProviderById(config, targetId);

  debugService.log("Chat", "Request (Simple)", {
    provider: provider?.type,
    model: provider?.selectedModel,
    message,
  });

  const ctx = getOpenAIProtocolClient(provider?.id);
  if (!ctx.ok) return "⚠️ Configuration Error: Provider missing baseUrl/model. Please check Settings.";

  const messages: OpenAIMessage[] = [
    { role: "system", content: "You are a helpful and knowledgeable AI assistant." },
    ...mapHistoryToOpenAIMessages(history),
    { role: "user", content: message },
  ];

  try {
    const data = await postChatCompletions(ctx, {
      model: ctx.model,
      messages,
      stream: false,
    });

    const content = (data.choices?.[0]?.message?.content ?? "") as string;
    debugService.log("Chat", "Response", { content });
    return content || "";
  } catch (e: any) {
    debugService.log("Chat", "Error", { error: e.message });
    return "";
  }
};

// --------------------------
// Export: simple chat (stream) - no tools
// --------------------------

export const sendSimpleChatStream = async (
  history: { role: string; parts: { text: string }[] }[],
  message: string,
  onChunk: (chunk: string) => void,
  providerId?: string,
  signal?: AbortSignal
): Promise<void> => {
  const config = getAppConfig();
  const targetId = providerId || config.defaults.chatProviderId;
  const provider = getProviderById(config, targetId);

  debugService.log("Chat", "Stream Request", {
    provider: provider?.type,
    model: provider?.selectedModel,
    message,
  });

  const ctx = getOpenAIProtocolClient(provider?.id);
  if (!ctx.ok) throw new Error("Configuration Error: Provider missing baseUrl/model.");

  const CONTEXT_WINDOW = 20;
  const limitedHistory = history.length > CONTEXT_WINDOW ? history.slice(-CONTEXT_WINDOW) : history;

  const messages: OpenAIMessage[] = [
    { role: "system", content: "You are a helpful and knowledgeable AI assistant." },
    ...mapHistoryToOpenAIMessages(limitedHistory),
    { role: "user", content: message },
  ];

  const res = await fetch(`${ctx.baseUrl}/chat/completions`, {
    method: "POST",
    headers: buildHeaders(ctx.apiKey),
    body: JSON.stringify({
      model: ctx.model,
      messages,
      stream: true,
    }),
    signal,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API Error: ${res.status} - ${text}`);
  }
  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let reasoningOpen = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (signal?.aborted) throw new Error("Aborted");

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ")) continue;

        const dataStr = trimmed.slice(6);
        if (dataStr === "[DONE]") continue;

        const json = safeJsonParse<any>(dataStr);
        if (!json) continue;

        const delta = json.choices?.[0]?.delta || {};
        const content = delta.content || "";
        const reasoning = (delta as any).reasoning_content || "";

        if (reasoning) {
          if (!reasoningOpen) {
            onChunk("<think>");
            reasoningOpen = true;
          }
          onChunk(reasoning);
        }

        if (content) {
          if (reasoningOpen) {
            onChunk("</think>");
            reasoningOpen = false;
          }
          onChunk(content);
        }
      }
    }
  } catch (error: any) {
    if (error.name === "AbortError") throw new Error("Aborted");
    throw error;
  } finally {
    if (reasoningOpen) onChunk("</think>");
  }
};

import * as math from '../lib/workflow/math';
import * as data from '../lib/workflow/data';
import * as analysis from '../lib/workflow/analysis';
import * as utility from '../lib/workflow/utility';
import { TOOL_DEFINITIONS, CATEGORY_LABELS } from '../lib/workflow/tools';
import { MCPTool } from '../types';
import i18n from '../i18n';

import { dipcaInvoke, dipcaFileUrl } from './dipca';

export const getAvailableTools = async (): Promise<MCPTool[]> => {
  await new Promise(resolve => setTimeout(resolve, 5));

  const lang = i18n.language.startsWith('zh') ? 'zh' : 'en';

  return TOOL_DEFINITIONS.map(t => ({
    id: t.id,
    name: t.name[lang as 'en' | 'zh'] || t.name['en'],
    description: t.description[lang as 'en' | 'zh'] || t.description['en'],
    category: t.category as MCPTool['category'],
  }));
};

export const getToolCategories = async (): Promise<Record<string, string>> => {
  const lang = i18n.language.startsWith('zh') ? 'zh' : 'en';

  const categories: Record<string, string> = {};
  for (const [key, value] of Object.entries(CATEGORY_LABELS)) {
    categories[key] = value[lang as 'en' | 'zh'] || value['en'];
  }
  return categories;
};

export const executeTool = async (toolId: string, context: any) => {
  await new Promise(resolve => setTimeout(resolve, 150));

  // ✅ dipca.*：走后端 /invoke
  if (toolId.startsWith('dipca.')) {
    // 🔥 注意：global_input 不是一次性的，要“累积更新”
    const global_input = context?.global_input ?? {};
    const prev_output = context?.__prev_output ?? null;
    const step_index = context?.step_index ?? 0;

    const res = await dipcaInvoke(toolId, global_input, prev_output, step_index);
    const output = res?.output;

    // plot：补一个可直接访问的图片 url
    if (output?.image_path && !output?.image_url) {
      output.image_url = dipcaFileUrl(output.image_path);
    }

    // ✅ 关键：把 output 合并进“累积的 global_input”
    const outputObj =
      output && typeof output === 'object' && !Array.isArray(output) ? output : null;

    const nextGlobalInput = outputObj ? { ...global_input, ...outputObj } : global_input;

    // ✅ 返回：既更新 __prev_output，也更新 global_input（让后续步骤能 pick 到 X_train_s 等）
    return {
      status: 'OK',
      output,
      context: {
        ...context,
        global_input: nextGlobalInput,
        __prev_output: output,
        ...(outputObj ? outputObj : {}),
      },
    };
  }

  // ===== mock tools (local) =====
  switch (toolId) {
    case 'matrix.add': return math.executeMatrixAdd(context);
    case 'matrix.mul': return math.executeMatrixMul(context);
    case 'matrix.inv': return math.executeMatrixInv(context);

    case 'data.normalize': return data.executeDataNormalize(context);

    case 'poly.fit': return analysis.executePolyFit(context);
    case 'poly.evaluate': return analysis.executePolyEvaluate(context);
    case 'error.metrics': return analysis.executeErrorMetrics(context);

    case 'utils.log': return utility.executeLogger(context);

    default:
      return {
        output: 'Mock data generated',
        status: 'OK',
        warning: `Tool ${toolId} implementation not found`,
      };
  }
};

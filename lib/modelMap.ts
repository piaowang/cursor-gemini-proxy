/** OpenAI 模型名（Cursor 里选的）→ Gemini REST 资源名 */
export const OPENAI_TO_GEMINI: Record<string, string> = {
  'gpt-4o-mini':  'gemini-2.0-flash-lite',   // 最便宜
  'gpt-4o':       'gemini-2.5-flash',         // 快速
  'gpt-4.1-mini': 'gemini-2.5-flash',         // 快速
  'gpt-4.1':      'gemini-2.5-pro',           // 写代码
  'gpt-4.1-pro':  'gemini-2.5-pro',           // 写代码
};

/** Anthropic 模型名 → Gemini REST 资源名 */
export const ANTHROPIC_TO_GEMINI: Record<string, string> = {
  'claude-haiku-4-5':             'gemini-2.0-flash-lite',
  'claude-3-haiku-20240307':      'gemini-2.0-flash-lite',
  'claude-3-5-haiku-20241022':    'gemini-2.5-flash',
  'claude-sonnet-4-5':            'gemini-2.5-pro',
  'claude-3-5-sonnet-20241022':   'gemini-2.5-pro',
  'claude-3-7-sonnet-20250219':   'gemini-2.5-pro',
  'claude-opus-4-5':              'gemini-2.5-pro',
};

export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

export function resolveGeminiModel(openaiModel: string | undefined): string {
  if (!openaiModel) return DEFAULT_GEMINI_MODEL;
  if (openaiModel in OPENAI_TO_GEMINI) return OPENAI_TO_GEMINI[openaiModel]!;
  if (openaiModel.startsWith('gemini-')) return openaiModel;
  return DEFAULT_GEMINI_MODEL;
}

export function resolveGeminiModelFromAnthropic(model: string | undefined): string {
  if (!model) return DEFAULT_GEMINI_MODEL;
  if (model in ANTHROPIC_TO_GEMINI) return ANTHROPIC_TO_GEMINI[model]!;
  if (model.startsWith('gemini-')) return model;
  return DEFAULT_GEMINI_MODEL;
}

export function listOpenAIModelIds(): string[] {
  return Object.keys(OPENAI_TO_GEMINI);
}

export function listAnthropicModelIds(): string[] {
  return Object.keys(ANTHROPIC_TO_GEMINI);
}

/** OpenAI 模型名（Cursor 里选的）→ Gemini REST 资源名 */
export const OPENAI_TO_GEMINI: Record<string, string> = {
  'gpt-4o-mini':  'gemini-2.5-flash-lite',        // 最便宜
  'gpt-4o':       'gemini-3-flash',                // 便宜
  'gpt-4.1-mini': 'gemini-3.1-flash-lite-preview', // 便宜预览版
  'gpt-4.1':      'gemini-3-pro-preview',          // 贵，写代码
  'gpt-4.1-pro':  'gemini-3.1-pro-preview',        // 最贵，最新写代码
};

export const DEFAULT_GEMINI_MODEL = 'gemini-3-flash';

export function resolveGeminiModel(openaiModel: string | undefined): string {
  if (!openaiModel) return DEFAULT_GEMINI_MODEL;
  if (openaiModel in OPENAI_TO_GEMINI) return OPENAI_TO_GEMINI[openaiModel]!;
  if (openaiModel.startsWith('gemini-')) return openaiModel;
  return DEFAULT_GEMINI_MODEL;
}

export function listOpenAIModelIds(): string[] {
  return Object.keys(OPENAI_TO_GEMINI);
}

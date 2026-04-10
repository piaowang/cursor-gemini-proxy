/** OpenAI 模型名（Cursor 里选的）→ Gemini REST 资源名（不含前缀） */
export const OPENAI_TO_GEMINI: Record<string, string> = {
  'gpt-4o-mini': 'gemini-2.5-flash',
  'gpt-4o': 'gemini-2.5-flash',
  'gpt-4.1-mini': 'gemini-2.5-flash',
  'gpt-4.1': 'gemini-2.5-flash',
  'gpt-4.1-pro': 'gemini-2.5-pro',
};

export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

export function resolveGeminiModel(openaiModel: string | undefined): string {
  if (!openaiModel) return DEFAULT_GEMINI_MODEL;
  if (openaiModel in OPENAI_TO_GEMINI) return OPENAI_TO_GEMINI[openaiModel]!;
  if (openaiModel.startsWith('gemini-')) return openaiModel;
  return DEFAULT_GEMINI_MODEL;
}

export function listOpenAIModelIds(): string[] {
  return Object.keys(OPENAI_TO_GEMINI);
}

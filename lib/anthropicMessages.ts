export type AnthropicContentBlock = { type: 'text'; text: string } | { type: string; [k: string]: unknown };

export type AnthropicMsg = {
  role: 'user' | 'assistant';
  content: string | AnthropicContentBlock[];
};

function textFromContent(content: string | AnthropicContentBlock[]): string {
  if (typeof content === 'string') return content;
  return content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('');
}

/** 将 Anthropic messages + system 转换为 Gemini generateContent payload */
export function buildGeminiPayloadFromAnthropic(
  system: string | undefined,
  messages: AnthropicMsg[],
) {
  const contents: { role: string; parts: { text: string }[] }[] = [];

  for (const m of messages) {
    const role = m.role === 'assistant' ? 'model' : 'user';
    const text = textFromContent(m.content);
    const last = contents[contents.length - 1];
    if (last && last.role === role) last.parts.push({ text });
    else contents.push({ role, parts: [{ text }] });
  }

  const body: Record<string, unknown> = { contents };
  if (system) {
    body.systemInstruction = { parts: [{ text: system }] };
  }
  return body;
}

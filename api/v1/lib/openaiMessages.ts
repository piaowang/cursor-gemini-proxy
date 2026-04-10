export type ChatMsg = { role: string; content: unknown };

function textFromContent(c: unknown): string {
  if (typeof c === 'string') return c;
  if (c == null) return '';
  if (Array.isArray(c)) {
    return c
      .map((p) => {
        if (typeof p === 'object' && p && 'text' in p) return String((p as { text: unknown }).text);
        return '';
      })
      .filter(Boolean)
      .join('');
  }
  return JSON.stringify(c);
}

export function buildGeminiPayload(messages: ChatMsg[]) {
  const systemParts = messages
    .filter((m) => m.role === 'system')
    .map((m) => textFromContent(m.content));
  const systemInstruction =
    systemParts.length > 0 ? { parts: [{ text: systemParts.join('\n\n') }] } : undefined;

  const rest = messages.filter((m) => m.role !== 'system');
  const contents: { role: string; parts: { text: string }[] }[] = [];

  for (const m of rest) {
    let role = m.role === 'assistant' ? 'model' : 'user';
    if (m.role === 'tool' || m.role === 'function') role = 'user';
    const text =
      m.role === 'tool' || m.role === 'function'
        ? `[${m.role}]\n${textFromContent(m.content)}`
        : textFromContent(m.content);

    const last = contents[contents.length - 1];
    if (last && last.role === role) last.parts.push({ text });
    else contents.push({ role, parts: [{ text }] });
  }

  const body: Record<string, unknown> = { contents };
  if (systemInstruction) body.systemInstruction = systemInstruction;
  return body;
}

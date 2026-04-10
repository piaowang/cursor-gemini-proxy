const BASE = 'https://generativelanguage.googleapis.com/v1beta';

export function geminiUrl(model: string, stream: boolean, apiKey: string) {
  const action = stream ? 'streamGenerateContent' : 'generateContent';
  const q = new URLSearchParams({ key: apiKey });
  if (stream) q.set('alt', 'sse');
  return `${BASE}/models/${encodeURIComponent(model)}:${action}?${q}`;
}

type GeminiErr = { error?: { message?: string; code?: number; status?: string } };

export async function readGeminiError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as GeminiErr;
    return j.error?.message || `${res.status} ${res.statusText}`;
  } catch {
    return `${res.status} ${res.statusText}`;
  }
}

export function extractText(data: Record<string, unknown>): string {
  const cands = data.candidates as Record<string, unknown>[] | undefined;
  const parts = (cands?.[0]?.content as Record<string, unknown> | undefined)?.parts as
    | { text?: string }[]
    | undefined;
  return parts?.map((p) => p.text ?? '').join('') ?? '';
}

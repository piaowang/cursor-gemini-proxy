import { geminiUrl, readGeminiError, extractText } from '../../../lib/geminiClient.js';
import { buildGeminiPayload, type ChatMsg } from '../../../lib/openaiMessages.js';
import { resolveGeminiModel } from '../../../lib/modelMap.js';
import { pipeGeminiSseToOpenAI } from '../../../lib/streamOpenAI.js';

function openaiError(status: number, message: string, type = 'invalid_request_error') {
  return { status, body: { error: { message, type } } };
}

export default async function handler(req: { method?: string; body?: unknown }, res: any) {
  if (req.method !== 'POST') {
    res.setHeader?.('Allow', 'POST');
    return res.status(405).json({ error: { message: 'Method not allowed', type: 'invalid_request_error' } });
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: { message: 'Set GOOGLE_API_KEY in Vercel Environment Variables', type: 'api_error' },
    });
  }

  const raw = req.body;
  const body = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const openaiModel = typeof body.model === 'string' ? body.model : 'gpt-4o';
  const geminiModel = resolveGeminiModel(openaiModel);
  const stream = Boolean(body.stream);
  const messages = (Array.isArray(body.messages) ? body.messages : []) as ChatMsg[];

  if (messages.length === 0) {
    const e = openaiError(400, 'messages is required and must be a non-empty array');
    return res.status(e.status).json(e.body);
  }

  const payload = buildGeminiPayload(messages);
  const url = geminiUrl(geminiModel, stream, apiKey);

  try {
    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!geminiRes.ok) {
      const msg = await readGeminiError(geminiRes);
      return res.status(502).json({
        error: { message: `Gemini: ${msg}`, type: 'api_error' },
      });
    }

    if (stream) {
      await pipeGeminiSseToOpenAI(res, geminiRes.body, openaiModel);
      return;
    }

    const data = (await geminiRes.json()) as Record<string, unknown>;
    const text = extractText(data);
    const id = `chatcmpl-${Date.now()}`;
    const created = Math.floor(Date.now() / 1000);

    return res.status(200).json({
      id,
      object: 'chat.completion',
      created,
      model: openaiModel,
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: text || '' },
          finish_reason: 'stop',
        },
      ],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upstream request failed';
    return res.status(500).json({ error: { message, type: 'api_error' } });
  }
}

import { geminiUrl, readGeminiError, extractText } from '../../../lib/geminiClient.js';
import { buildGeminiPayloadFromAnthropic, type AnthropicMsg } from '../../../lib/anthropicMessages.js';
import { resolveGeminiModelFromAnthropic } from '../../../lib/modelMap.js';
import { pipeGeminiSseToAnthropic } from '../../../lib/streamAnthropic.js';

function anthropicError(status: number, type: string, message: string) {
  return { status, body: { type: 'error', error: { type, message } } };
}

async function parseBody(req: any): Promise<Record<string, unknown>> {
  const b = req.body;
  if (b !== null && b !== undefined) {
    if (typeof b === 'object' && !Buffer.isBuffer(b)) return b as Record<string, unknown>;
    const s = Buffer.isBuffer(b) ? b.toString('utf8') : String(b);
    try { return JSON.parse(s); } catch { /* fall through */ }
  }
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader?.('Allow', 'POST');
    return res.status(405).json({ type: 'error', error: { type: 'invalid_request_error', message: 'Method not allowed' } });
  }

  // 鉴权：支持 x-api-key 或 Authorization: Bearer
  const proxyKey = process.env.PROXY_API_KEY;
  if (proxyKey) {
    const xApiKey = req.headers?.['x-api-key'] ?? '';
    const auth = req.headers?.['authorization'] ?? '';
    const bearerToken = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    const token = xApiKey || bearerToken;
    if (token !== proxyKey) {
      const e = anthropicError(401, 'authentication_error', 'Invalid API key');
      return res.status(e.status).json(e.body);
    }
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    const e = anthropicError(500, 'api_error', 'Set GOOGLE_API_KEY in environment variables');
    return res.status(e.status).json(e.body);
  }

  const body = await parseBody(req);
  const anthropicModel = typeof body.model === 'string' ? body.model : 'claude-3-5-sonnet-20241022';
  const geminiModel = resolveGeminiModelFromAnthropic(anthropicModel);
  const stream = Boolean(body.stream);
  const system = typeof body.system === 'string' ? body.system : undefined;
  const messages = Array.isArray(body.messages) ? (body.messages as AnthropicMsg[]) : [];

  if (messages.length === 0) {
    const e = anthropicError(400, 'invalid_request_error', 'messages is required and must be a non-empty array');
    return res.status(e.status).json(e.body);
  }

  const payload = buildGeminiPayloadFromAnthropic(system, messages);
  const url = geminiUrl(geminiModel, stream, apiKey);

  try {
    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!geminiRes.ok) {
      const msg = await readGeminiError(geminiRes);
      return res.status(502).json({ type: 'error', error: { type: 'api_error', message: `Gemini: ${msg}` } });
    }

    if (stream) {
      await pipeGeminiSseToAnthropic(res, geminiRes.body, anthropicModel);
      return;
    }

    const data = (await geminiRes.json()) as Record<string, unknown>;
    const text = extractText(data);
    const msgId = `msg_${Date.now()}`;

    return res.status(200).json({
      id: msgId,
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: text || '' }],
      model: anthropicModel,
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: { input_tokens: 0, output_tokens: 0 },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upstream request failed';
    return res.status(500).json({ type: 'error', error: { type: 'api_error', message } });
  }
}

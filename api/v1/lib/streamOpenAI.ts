import { extractText } from './geminiClient.js';

function sseChunk(obj: object) {
  return `data: ${JSON.stringify(obj)}\n\n`;
}

/** 将 Gemini `alt=sse` 流转换为 OpenAI chat.completion.chunk */
export async function pipeGeminiSseToOpenAI(
  res: {
    writeHead: (...a: unknown[]) => void;
    write: (c: string) => void;
    end: () => void;
    status: (n: number) => { json: (b: unknown) => void };
  },
  geminiBody: ReadableStream<Uint8Array> | null,
  openaiModel: string,
) {
  if (!geminiBody) {
    res.status(502).json({ error: { message: 'Empty stream body', type: 'api_error' } });
    return;
  }

  const id = `chatcmpl-${Date.now()}`;
  const created = Math.floor(Date.now() / 1000);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  res.write(
    sseChunk({
      id,
      object: 'chat.completion.chunk',
      created,
      model: openaiModel,
      choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }],
    }),
  );

  const reader = geminiBody.getReader();
  const dec = new TextDecoder();
  let buf = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let idx: number;
      while ((idx = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, idx).trimEnd();
        buf = buf.slice(idx + 1);
        if (!line.startsWith('data:')) continue;
        const jsonStr = line.slice(5).trim();
        if (!jsonStr || jsonStr === '[DONE]') continue;
        let data: Record<string, unknown>;
        try {
          data = JSON.parse(jsonStr) as Record<string, unknown>;
        } catch {
          continue;
        }
        const piece = extractText(data);
        if (piece) {
          res.write(
            sseChunk({
              id,
              object: 'chat.completion.chunk',
              created,
              model: openaiModel,
              choices: [{ index: 0, delta: { content: piece }, finish_reason: null }],
            }),
          );
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  res.write(
    sseChunk({
      id,
      object: 'chat.completion.chunk',
      created,
      model: openaiModel,
      choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
    }),
  );
  res.write('data: [DONE]\n\n');
  res.end();
}

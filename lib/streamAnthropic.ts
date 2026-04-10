import { extractText } from './geminiClient.js';

type Res = {
  writeHead: (...a: unknown[]) => void;
  write: (c: string) => void;
  end: () => void;
  status: (n: number) => { json: (b: unknown) => void };
};

function sseLine(event: string, data: object) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/** 将 Gemini `alt=sse` 流转换为 Anthropic Messages streaming 格式 */
export async function pipeGeminiSseToAnthropic(
  res: Res,
  geminiBody: ReadableStream<Uint8Array> | null,
  anthropicModel: string,
) {
  if (!geminiBody) {
    res.status(502).json({ type: 'error', error: { type: 'api_error', message: 'Empty stream body' } });
    return;
  }

  const msgId = `msg_${Date.now()}`;
  const created = Math.floor(Date.now() / 1000);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // message_start
  res.write(sseLine('message_start', {
    type: 'message_start',
    message: {
      id: msgId,
      type: 'message',
      role: 'assistant',
      content: [],
      model: anthropicModel,
      stop_reason: null,
      stop_sequence: null,
      usage: { input_tokens: 0, output_tokens: 1 },
    },
  }));

  // content_block_start
  res.write(sseLine('content_block_start', {
    type: 'content_block_start',
    index: 0,
    content_block: { type: 'text', text: '' },
  }));

  res.write(sseLine('ping', { type: 'ping' }));

  const reader = geminiBody.getReader();
  const dec = new TextDecoder();
  let buf = '';
  let outputTokens = 0;

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
        try { data = JSON.parse(jsonStr) as Record<string, unknown>; }
        catch { continue; }
        const piece = extractText(data);
        if (piece) {
          outputTokens += 1;
          res.write(sseLine('content_block_delta', {
            type: 'content_block_delta',
            index: 0,
            delta: { type: 'text_delta', text: piece },
          }));
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  // content_block_stop
  res.write(sseLine('content_block_stop', { type: 'content_block_stop', index: 0 }));

  // message_delta
  res.write(sseLine('message_delta', {
    type: 'message_delta',
    delta: { stop_reason: 'end_turn', stop_sequence: null },
    usage: { output_tokens: outputTokens },
  }));

  // message_stop
  res.write(sseLine('message_stop', { type: 'message_stop' }));

  res.end();
}

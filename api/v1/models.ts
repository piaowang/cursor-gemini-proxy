import { listOpenAIModelIds } from '../../lib/modelMap.js';

export default function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader?.('Allow', 'GET');
    return res.status(405).json({ error: { message: 'Method not allowed', type: 'invalid_request_error' } });
  }

  const proxyKey = process.env.PROXY_API_KEY;
  if (proxyKey) {
    const auth = req.headers?.['authorization'] ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (token !== proxyKey) {
      return res.status(401).json({ error: { message: 'Invalid API key', type: 'invalid_request_error' } });
    }
  }

  const now = Math.floor(Date.now() / 1000);
  const data = listOpenAIModelIds().map((id) => ({
    id,
    object: 'model' as const,
    created: now,
    owned_by: 'openai',
  }));

  return res.status(200).json({ object: 'list', data });
}

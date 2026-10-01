import type { VercelRequest, VercelResponse } from '@vercel/node';
import { askTradeAssistant } from '../src/server/geminiHandler';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Método não permitido' });
    return;
  }

  try {
    const { question, context } = req.body || {};
    const answer = await askTradeAssistant(question, context);
    res.status(200).json({ success: true, answer });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Erro' });
  }
}

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateTradeExecutiveReport } from '../src/server/geminiHandler';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Método não permitido' });
    return;
  }

  try {
    const report = await generateTradeExecutiveReport(req.body || {});
    res.status(200).json({ success: true, report });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Erro' });
  }
}

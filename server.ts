import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { generateTradeExecutiveReport, askTradeAssistant } from './src/server/geminiHandler.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '10mb' }));

  // AI Endpoints
  app.post('/api/ai-diagnostico', async (req, res) => {
    try {
      const report = await generateTradeExecutiveReport(req.body || {});
      res.json({ success: true, report });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Erro' });
    }
  });

  app.post('/api/ai-chat', async (req, res) => {
    try {
      const { question, context } = req.body || {};
      const answer = await askTradeAssistant(question, context);
      res.json({ success: true, answer });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Erro' });
    }
  });

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

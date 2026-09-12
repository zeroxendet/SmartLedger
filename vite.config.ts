import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, Plugin} from 'vite';

// LINT.IfChange(aistudio_media_plugin)
function aistudioMediaPlugin(): Plugin {
  return {
    name: 'vite-plugin-aistudio-media',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.startsWith('/assets/aistudio/')) {
          const rawPath = req.url.split('?')[0].split('#')[0];
          try {
            const decodedPath = decodeURIComponent(rawPath);
            const relativePath = decodedPath.replace(/^\//, '');
            const aistudioDir = path.resolve(
              __dirname,
              'public',
              'assets',
              'aistudio',
            );
            const filePath = path.resolve(__dirname, 'public', relativePath);
            if (
              filePath.startsWith(aistudioDir + path.sep) &&
              fs.existsSync(filePath) &&
              fs.statSync(filePath).isFile()
            ) {
              const ext = path.extname(filePath).toLowerCase();
              const mimeMap: Record<string, string> = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.webp': 'image/webp',
                '.svg': 'image/svg+xml',
                '.bmp': 'image/bmp',
                '.ico': 'image/x-icon',
                '.mp4': 'video/mp4',
                '.webm': 'video/webm',
                '.ogv': 'video/ogg',
                '.mp3': 'audio/mpeg',
                '.wav': 'audio/wav',
                '.ogg': 'audio/ogg',
                '.pdf': 'application/pdf',
              };
              res.setHeader(
                'Content-Type',
                mimeMap[ext] || 'application/octet-stream',
              );
              res.setHeader('Cache-Control', 'no-cache');
              fs.createReadStream(filePath).pipe(res);
              return;
            }
          } catch {
            // Fall through if URI decoding or file access fails
          }
        }
        next();
      });
    },
  };
}
// LINT.ThenChange(//depot/google3/java/com/google/alkali/boq/makersuite/applet_dev_service/templates/initializers/react_theme/vite.config.ts:aistudio_media_plugin)

function geminiApiPlugin(): Plugin {
  return {
    name: 'vite-plugin-gemini-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/ai/ask' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', async () => {
            let prompt = '';
            let context: any = {};
            try {
              const parsed = JSON.parse(body || '{}');
              prompt = parsed.prompt || '';
              context = parsed.context || {};
              const apiKey = process.env.GEMINI_API_KEY;

              if (!apiKey) {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  reply: `Looking at ${context?.businessName || 'your business'}: You made ${context?.profitToday?.toLocaleString() || 0} ${context?.currency || 'RWF'} profit today with ${context?.salesToday?.toLocaleString() || 0} in sales. Cash available is ${context?.cashAvailable?.toLocaleString() || 0} ${context?.currency || 'RWF'}. Your health score is ${context?.healthScore || 85}/100.`
                }));
                return;
              }

              const { GoogleGenAI } = await import('@google/genai');
              const ai = new GoogleGenAI({ apiKey });

              const systemInstruction = `You are SmartLedger AI, a business companion for small business owners and shopkeepers.
You speak clearly, warmly, concisely, and avoid complex accounting jargon.
Always use simple terms (sales instead of gross revenue, profit instead of net earnings, people who owe you instead of accounts receivable, people you owe instead of accounts payable).
Business: ${context?.businessName} (${context?.businessType})
Currency: ${context?.currency}
Today's Sales: ${context?.salesToday}
Today's Expenses: ${context?.expensesToday}
Today's Profit: ${context?.profitToday}
Cash Available: ${context?.cashAvailable}
Receivables (Customers owe): ${context?.receivables}
Payables (Owe suppliers): ${context?.payables}
Health Score: ${context?.healthScore}/100
Answer the user's question directly in 1 to 3 friendly sentences.`;

              const response = await ai.models.generateContent({
                model: 'gemini-3.8-flash',
                contents: `${systemInstruction}\n\nUser Question: ${prompt}`,
              });

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ reply: response.text }));
            } catch {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ 
                reply: `Here is your current position: Today's sales stand at ${context?.salesToday?.toLocaleString() || 0} ${context?.currency || 'RWF'} with healthy profit margins. Keep track of customer credit balances!` 
              }));
            }
          });
          return;
        }

        if (req.url === '/api/ai/parse-command' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const parsed = JSON.parse(body || '{}');
              const command = parsed.command || '';
              const products = parsed.products || [];
              const customers = parsed.customers || [];
              const suppliers = parsed.suppliers || [];
              const currency = parsed.currency || 'USD';
              const isBakeryMode = !!parsed.isBakeryMode;
              const apiKey = process.env.GEMINI_API_KEY;

              if (!apiKey) {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, fallbackRequired: true }));
                return;
              }

              const { GoogleGenAI } = await import('@google/genai');
              const ai = new GoogleGenAI({ apiKey });

              const prompt = `You are the intelligence engine of SmartLedger, a business accounting application.
Parse the user's natural language command into a structured database update JSON.

Context:
- Products: ${JSON.stringify(products.map((p: any) => ({ id: p.id, name: p.name, stock: p.stock, sellingPrice: p.sellingPrice, costPrice: p.costPrice })))}
- Customers: ${JSON.stringify(customers.map((c: any) => ({ id: c.id, name: c.name, owed: c.amountOwed })))}
- Suppliers: ${JSON.stringify(suppliers.map((s: any) => ({ id: s.id, name: s.name, owed: s.amountOwed })))}
- Currency: ${currency}
- Bakery Mode: ${isBakeryMode}

User Command: "${command}"

Instructions:
1. If the command describes bakery production, made, sold, or waste (e.g. "Update today's bakery entry: 500 made, 440 sold, 25 wasted"):
   actionType = "bakery_entry"
   data = { "productName": string, "productId": string (or empty), "made": number, "sold": number, "wasted": number, "sellingPrice": number, "costPrice": number }
2. If it is a sale (e.g. "Sold 10 bread for cash"):
   actionType = "record_sale"
   data = { "productName": string, "productId": string, "quantity": number, "unitPrice": number, "totalAmount": number, "paymentMethod": "Cash"|"Credit"|"MobileMoney"|"Bank", "customerName": string }
3. If it is an expense (e.g. "Spent 15000 on flour"):
   actionType = "record_expense"
   data = { "category": string, "amount": number, "notes": string, "paidVia": "Cash"|"Bank"|"MobileMoney" }
4. If it is a new product (e.g. "Add product Sourdough Bread, cost 1.5, sell 4, stock 50"):
   actionType = "add_product"
   data = { "name": string, "category": string, "costPrice": number, "sellingPrice": number, "initialStock": number }
5. If customer debt payment (e.g. "Maria paid 5000 debt"):
   actionType = "customer_debt_payment"
   data = { "customerName": string, "amount": number }

Return ONLY raw JSON with keys: "actionType", "summary", "data".`;

              const response = await ai.models.generateContent({
                model: 'gemini-3.8-flash',
                contents: prompt,
                config: {
                  responseMimeType: 'application/json',
                },
              });

              const text = response.text?.trim() || '{}';
              const clean = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
              const actionResult = JSON.parse(clean);

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, result: actionResult }));
            } catch (err: any) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, fallbackRequired: true, error: err?.message }));
            }
          });
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), aistudioMediaPlugin(), geminiApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

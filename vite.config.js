import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

function localGasProxy(gasUrl) {
  return {
    name: 'bedagan-local-gas-proxy',
    configureServer(server) {
      server.middlewares.use('/api', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405; res.end(JSON.stringify({success:false,message:'Method not allowed'})); return;
        }
        if (!gasUrl) {
          res.statusCode = 500; res.setHeader('Content-Type','application/json');
          res.end(JSON.stringify({success:false,message:'Buat .env.local dan isi GAS_WEB_APP_URL dengan URL Web App /exec.'})); return;
        }
        let raw=''; req.on('data', chunk => raw += chunk); req.on('end', async () => {
          try {
            const upstream = await fetch(gasUrl, { method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:raw || '{}' });
            const text = await upstream.text();
            res.statusCode = 200; res.setHeader('Content-Type','application/json'); res.end(text);
          } catch (error) {
            res.statusCode = 502; res.setHeader('Content-Type','application/json');
            res.end(JSON.stringify({success:false,message:error.message || 'Gagal menghubungi Apps Script'}));
          }
        });
      });
    }
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '');
  return { plugins:[react(), localGasProxy(env.GAS_WEB_APP_URL)] };
});

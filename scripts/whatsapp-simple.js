#!/usr/bin/env node

/**
 * WhatsApp QR Simple Server
 * Versión minimalista que funciona
 */

const http = require('http');
const playwrightCore = require('/home/ubuntu/.nvm/versions/node/v24.14.1/lib/node_modules/openclaw/node_modules/playwright-core');

const PORT = 8080;
const USER_DATA_DIR = '/home/ubuntu/.openclaw/credentials/whatsapp/default';

let browser = null;
let page = null;
let currentQrBuffer = null;
let sessionActive = false;

// HTML simple
const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WhatsApp QR - OpenClaw</title>
  <style>
    body {
      font-family: sans-serif;
      text-align: center;
      padding: 40px;
      background: #25D366;
      color: white;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .container {
      background: rgba(255,255,255,0.1);
      padding: 40px;
      border-radius: 20px;
      max-width: 500px;
      width: 100%;
      backdrop-filter: blur(10px);
    }
    h1 { margin-bottom: 10px; }
    .qr-box {
      background: white;
      padding: 20px;
      border-radius: 15px;
      margin: 30px 0;
      display: inline-block;
    }
    #qr-img {
      max-width: 300px;
      width: 100%;
      border-radius: 10px;
    }
    .status {
      padding: 15px;
      border-radius: 10px;
      margin: 20px 0;
      font-weight: bold;
    }
    .waiting { background: rgba(255,193,7,0.2); border: 2px solid #FFC107; }
    .connected { background: rgba(76,175,80,0.2); border: 2px solid #4CAF50; }
    .instructions {
      text-align: left;
      background: rgba(255,255,255,0.2);
      padding: 20px;
      border-radius: 10px;
      margin-top: 20px;
    }
    ol { margin-left: 20px; }
    li { margin-bottom: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📱 WhatsApp QR</h1>
    <p>Escanea para conectar OpenClaw a WhatsApp</p>
    
    <div class="qr-box">
      <img id="qr-img" src="/qr.png" alt="QR Code">
    </div>
    
    <div id="status" class="status waiting">
      ⏳ Inicializando...
    </div>
    
    <div class="instructions">
      <h3>Instrucciones:</h3>
      <ol>
        <li>Abre WhatsApp en tu teléfono</li>
        <li>Toca ⋮ → Linked Devices</li>
        <li>Escanea este código QR</li>
        <li>Espera a que la página detecte la conexión</li>
      </ol>
      <p><strong>Nota:</strong> El QR se actualiza automáticamente.</p>
    </div>
    
    <div style="margin-top:20px;font-size:14px;opacity:0.8;">
      🔄 Auto-refresh cada 5 segundos
    </div>
  </div>
  
  <script>
    function update() {
      // Actualizar imagen QR
      document.getElementById('qr-img').src = '/qr.png?' + Date.now();
      
      // Actualizar estado
      fetch('/status')
        .then(r => r.json())
        .then(data => {
          const status = document.getElementById('status');
          if (data.sessionActive) {
            status.className = 'status connected';
            status.innerHTML = '✅ ¡WhatsApp CONECTADO!';
            setTimeout(() => location.href = '/connected', 2000);
          } else if (data.qrAvailable) {
            status.className = 'status waiting';
            status.innerHTML = '⏳ Esperando escaneo...';
          } else {
            status.className = 'status waiting';
            status.innerHTML = '🔄 Buscando QR...';
          }
        })
        .catch(() => {
          document.getElementById('status').innerHTML = '❌ Error de conexión';
        });
    }
    
    setInterval(update, 5000);
    update();
  </script>
</body>
</html>
`;

async function initBrowser() {
  console.log('Iniciando browser...');
  
  browser = await playwrightCore.chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    userDataDir: USER_DATA_DIR,
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  page = await context.newPage();
  
  console.log('Cargando WhatsApp Web...');
  await page.goto('https://web.whatsapp.com', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(10000);
  
  console.log('WhatsApp Web cargado, iniciando captura periódica');
  
  // Captura inicial
  await captureQR();
  
  // Captura periódica cada 10s
  setInterval(async () => {
    if (!sessionActive) {
      await captureQR();
    }
  }, 10000);
}

async function captureQR() {
  if (!page || sessionActive) return;
  
  try {
    // Verificar sesión activa
    const sessionEl = await page.$('div[data-testid="chat-list"], div[data-testid="conversation-panel"]');
    if (sessionEl) {
      sessionActive = true;
      console.log('¡Sesión activa detectada!');
      return;
    }
    
    // Buscar QR
    const qrEl = await page.$('canvas[aria-label="Scan me!"], div[data-ref] canvas, canvas');
    if (qrEl) {
      currentQrBuffer = await qrEl.screenshot();
      console.log('QR capturado');
    } else {
      // Recargar si no hay QR después de 30s
      setTimeout(async () => {
        if (!sessionActive && page) {
          console.log('Recargando página...');
          await page.reload({ waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(5000);
        }
      }, 30000);
    }
  } catch (err) {
    console.error('Error capturando QR:', err.message);
  }
}

// Crear servidor HTTP
const server = http.createServer((req, res) => {
  const url = require('url').parse(req.url);
  
  if (url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  } else if (url.pathname === '/qr.png') {
    if (currentQrBuffer && !sessionActive) {
      res.writeHead(200, { 'Content-Type': 'image/png' });
      res.end(currentQrBuffer);
    } else {
      // Placeholder
      const placeholder = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );
      res.writeHead(200, { 'Content-Type': 'image/png' });
      res.end(placeholder);
    }
  } else if (url.pathname === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      qrAvailable: !!currentQrBuffer,
      sessionActive: sessionActive,
      timestamp: Date.now()
    }));
  } else if (url.pathname === '/connected') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h1>✅ WhatsApp Conectado</h1><p>La sesión está activa.</p><a href="/">Volver</a>');
  } else if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      browser: !!browser,
      page: !!page,
      sessionActive: sessionActive
    }));
  } else {
    res.writeHead(404);
    res.end('404');
  }
});

// Iniciar
async function start() {
  console.log('Iniciando servidor WhatsApp QR...');
  
  server.listen(PORT, () => {
    console.log(`Servidor en http://localhost:${PORT}`);
    console.log('Para acceder remotamente:');
    console.log(`ssh -L 8080:localhost:8080 ubuntu@$(curl -s ifconfig.me)`);
    console.log('Luego abre http://localhost:8080');
  });
  
  // Iniciar browser después de 2s
  setTimeout(() => {
    initBrowser().catch(err => {
      console.error('Error iniciando browser:', err);
    });
  }, 2000);
}

// Manejar cierre
process.on('SIGINT', async () => {
  console.log('\nCerrando...');
  if (browser) await browser.close();
  process.exit(0);
});

start();
#!/usr/bin/env node

/**
 * WhatsApp QR Robust Server
 * Con manejo de errores mejorado y diagnóstico
 */

const http = require('http');
const playwrightCore = require('/home/ubuntu/.nvm/versions/node/v24.14.1/lib/node_modules/openclaw/node_modules/playwright-core');
const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const PORT = 8080;
const USER_DATA_DIR = '/home/ubuntu/.openclaw/credentials/whatsapp/default';

// Estado global
let browser = null;
let page = null;
let currentQrBuffer = null;
let sessionActive = false;
let lastError = null;
let browserReady = false;
let pageReady = false;
let lastQrCapture = 0;

// Configuración de browser
const BROWSER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-accelerated-2d-canvas',
  '--no-first-run',
  '--no-zygote',
  '--disable-gpu'
];

function log(msg) {
  const ts = new Date().toISOString().substring(11, 19);
  console.log(`[${ts}] ${msg}`);
}

function error(msg, err = null) {
  const ts = new Date().toISOString().substring(11, 19);
  console.error(`[${ts}] ❌ ${msg}`, err ? err.message : '');
  lastError = err ? err.message : msg;
}

async function sendTelegramMessage(text) {
  try {
    const command = `curl -s -X POST "https://api.telegram.org/bot8799472381:AAGkpBP_oGE3lzghEFrHe_8CH2RVXu6LvIk/sendMessage" \
      -d "chat_id=5560884037" \
      -d "text=${encodeURIComponent(text)}"`;
    
    await execAsync(command);
  } catch (err) {
    error('Error enviando mensaje Telegram', err);
  }
}

async function initializeBrowser() {
  if (browserReady && browser && page) {
    log('Browser ya inicializado');
    return true;
  }
  
  log('🚀 Inicializando browser...');
  
  try {
    // Cerrar browser anterior si existe
    if (browser) {
      try {
        await browser.close();
      } catch (err) {
        // Ignorar
      }
    }
    
    browser = await playwrightCore.chromium.launch({
      headless: true,
      args: BROWSER_ARGS,
      timeout: 60000
    });
    
    log('✅ Browser lanzado');
    
    const context = await browser.newContext({
      userDataDir: USER_DATA_DIR,
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      javaScriptEnabled: true,
      bypassCSP: true
    });
    
    page = await context.newPage();
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(60000);
    
    log('🌐 Navegando a WhatsApp Web...');
    const response = await page.goto('https://web.whatsapp.com', {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    
    if (!response || !response.ok()) {
      throw new Error(`HTTP ${response ? response.status() : 'no response'}`);
    }
    
    log(`✅ WhatsApp Web cargado (status: ${response.status()})`);
    
    // Esperar a que cargue completamente
    await page.waitForTimeout(10000);
    
    // Tomar screenshot inicial para diagnóstico
    try {
      const screenshot = await page.screenshot({ fullPage: false });
      fs.writeFileSync('/tmp/whatsapp-initial.png', screenshot);
      log('📸 Screenshot inicial guardado');
    } catch (err) {
      error('Error tomando screenshot inicial', err);
    }
    
    browserReady = true;
    pageReady = true;
    lastError = null;
    
    log('✅ Browser completamente inicializado');
    return true;
    
  } catch (err) {
    error('Error inicializando browser', err);
    browserReady = false;
    pageReady = false;
    
    if (browser) {
      try {
        await browser.close();
      } catch (closeErr) {
        // Ignorar
      }
      browser = null;
      page = null;
    }
    
    return false;
  }
}

async function checkSession() {
  if (!pageReady || !page) return false;
  
  try {
    // Verificar elementos que indican sesión activa
    const sessionSelectors = [
      'div[data-testid="chat-list"]',
      'div[data-testid="conversation-panel"]',
      'div[aria-label="Chat list"]',
      'div[data-testid="intro-title"]' // "Keep your phone connected"
    ];
    
    for (const selector of sessionSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          log(`✅ Elemento de sesión encontrado: ${selector}`);
          return true;
        }
      } catch (err) {
        // Continuar con siguiente selector
      }
    }
    
    return false;
  } catch (err) {
    error('Error verificando sesión', err);
    return false;
  }
}

async function captureQR() {
  if (!pageReady || !page) {
    log('Page no lista para capturar QR');
    return false;
  }
  
  try {
    log('🔍 Buscando QR...');
    
    // Verificar si la página sigue válida
    try {
      await page.title(); // Operación simple para verificar contexto
    } catch (err) {
      if (err.message.includes('context') || err.message.includes('destroyed')) {
        log('⚠️ Contexto destruido, recargando página...');
        pageReady = false;
        return false;
      }
    }
    
    // Buscar QR con múltiples selectores
    const qrSelectors = [
      'canvas[aria-label="Scan me!"]',
      'div[data-ref] canvas',
      'div[data-testid="qrcode"] canvas',
      'canvas'
    ];
    
    let qrElement = null;
    let foundSelector = null;
    
    for (const selector of qrSelectors) {
      try {
        qrElement = await page.$(selector);
        if (qrElement) {
          // Verificar que tenga tamaño real
          const box = await qrElement.boundingBox().catch(() => null);
          if (box && box.width > 50 && box.height > 50) {
            foundSelector = selector;
            break;
          }
          qrElement = null;
        }
      } catch (err) {
        // Continuar con siguiente selector
      }
    }
    
    if (!qrElement) {
      log('⚠️ No se encontró QR con los selectores habituales');
      
      // Tomar screenshot diagnóstico
      try {
        const screenshot = await page.screenshot({ fullPage: false });
        fs.writeFileSync('/tmp/whatsapp-nod.png', screenshot);
        log('📸 Screenshot diagnóstico guardado (no QR)');
      } catch (err) {
        error('Error tomando screenshot diagnóstico', err);
      }
      
      return false;
    }
    
    log(`🎯 QR encontrado con selector: ${foundSelector}`);
    
    // Capturar screenshot del QR
    try {
      currentQrBuffer = await qrElement.screenshot();
      lastQrCapture = Date.now();
      log(`📸 QR capturado (${currentQrBuffer.length} bytes)`);
      return true;
    } catch (err) {
      if (err.message.includes('context') || err.message.includes('destroyed')) {
        log('⚠️ Contexto destruido al capturar QR, recargando...');
        pageReady = false;
        return false;
      }
      error('Error capturando screenshot del QR', err);
      return false;
    }
    
  } catch (err) {
    error('Error en captura de QR', err);
    return false;
  }
}

async function reloadPage() {
  if (!browser || !page) {
    log('No hay página para recargar');
    return false;
  }
  
  try {
    log('🔄 Recargando página...');
    await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(5000);
    pageReady = true;
    log('✅ Página recargada');
    return true;
  } catch (err) {
    error('Error recargando página', err);
    pageReady = false;
    return false;
  }
}

// Función principal de captura periódica
async function startCaptureLoop() {
  log('🔄 Iniciando loop de captura...');
  
  while (true) {
    try {
      // Verificar y mantener browser
      if (!browserReady || !pageReady) {
        log('Reinicializando browser...');
        const initialized = await initializeBrowser();
        if (!initialized) {
          log('⚠️ Falló inicialización, esperando 30s...');
          await new Promise(resolve => setTimeout(resolve, 30000));
          continue;
        }
      }
      
      // Verificar sesión
      sessionActive = await checkSession();
      if (sessionActive) {
        log('✅ ¡Sesión de WhatsApp activa!');
        await sendTelegramMessage('🎉 ¡WhatsApp CONECTADO! Sesión activa detectada.');
        break;
      }
      
      // Intentar capturar QR
      const captured = await captureQR();
      
      if (!captured) {
        // Si no se capturó QR después de 30 segundos, recargar página
        if (Date.now() - lastQrCapture > 30000) {
          log('⏰ Sin QR por 30s, recargando...');
          await reloadPage();
        }
      }
      
      // Esperar antes de siguiente intento
      await new Promise(resolve => setTimeout(resolve, 10000));
      
    } catch (err) {
      error('Error en loop de captura', err);
      browserReady = false;
      pageReady = false;
      await new Promise(resolve => setTimeout(resolve, 15000));
    }
  }
}

// HTML de la página principal
const htmlPage = `
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
    .error { background: rgba(244,67,54,0.2); border: 2px solid #F44336; }
    .instructions {
      text-align: left;
      background: rgba(255,255,255,0.2);
      padding: 20px;
      border-radius: 10px;
      margin-top: 20px;
    }
    ol { margin-left: 20px; }
    li { margin-bottom: 10px; }
    .debug {
      margin-top: 20px;
      font-size: 12px;
      opacity: 0.7;
    }
    .debug a { color: #FFC107; text-decoration: none; }
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
      <p><strong>Nota:</strong> El QR se actualiza automáticamente cada 10 segundos.</p>
    </div>
    
    <div class="debug">
      <a href="/debug" target="_blank">Ver diagnóstico</a> | 
      <a href="/full" target="_blank">Ver página completa</a>
    </div>
    
    <div style="margin-top:20px;font-size:14px;opacity:0.8;">
      🔄 Auto-refresh cada 5 segundos
    </div>
  </div>
  
  <script>
    function update() {
      // Actualizar imagen QR con timestamp
      document.getElementById('qr-img').src = '/qr.png?' + Date.now();
      
      // Actualizar estado
      fetch('/status')
        .then(r => r.json())
        .then(data => {
          const status = document.getElementById('status');
          if (data.error) {
            status.className = 'status error';
            status.innerHTML = '❌ Error: ' + data.error;
          } else if (data.sessionActive) {
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

// Crear servidor HTTP
const server = http.createServer((req, res) => {
  const url = require('url').parse(req.url);
  
  // Headers comunes
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  try {
    if (url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(htmlPage);
      
    } else if (url.pathname === '/qr.png') {
      if (currentQrBuffer && !sessionActive) {
        res.writeHead(200, { 'Content-Type': 'image/png' });
        res.end(currentQrBuffer);
      } else {
        // Placeholder QR
        const placeholder = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          'base64'
        );
        res.writeHead(200, { 'Content-Type': 'image/png' });
        res.end(placeholder);
      }
      
    } else if (url.pathname === '/full') {
      // Servir screenshot completo de la página
      if (fs.existsSync('/tmp/whatsapp-initial.png')) {
        const screenshot = fs.readFileSync('/tmp/whatsapp-initial.png');
        res.writeHead(200, { 'Content-Type': 'image/png' });
        res.end(screenshot);
      } else if (fs.existsSync('/tmp/whatsapp-nod.png')) {
        const screenshot = fs.readFileSync('/tmp/whatsapp-nod.png');
        res.writeHead(200, { 'Content-Type': 'image/png' });
        res.end(screenshot);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('No hay screenshot disponible');
      }
      
    } else if (url.pathname === '/debug') {
      // Página de diagnóstico
      const debugHtml = `
      <!DOCTYPE html>
      <html>
      <head><title>Diagnóstico</title></head>
      <body>
        <h1>Diagnóstico WhatsApp QR</h1>
        <pre>${JSON.stringify({
          timestamp: new Date().toISOString(),
          browserReady,
          pageReady,
          sessionActive,
          lastError,
          lastQrCapture: lastQrCapture ? new Date(lastQrCapture).toISOString() : null,
          qrAvailable: !!currentQrBuffer
        }, null, 2)}</pre>
        <h2>Screenshots:</h2>
        <p><a href="/full">Ver screenshot actual</a></p>
        ${fs.existsSync('/tmp/whatsapp-initial.png') ? 
          '<p><img src="/full" style="max-width:100%;border:1px solid #ccc;"></p>' : 
          '<p>No hay screenshot disponible</p>'}
        <p><a href="/">Volver al QR</a></p>
      </body>
      </html>
      `;
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(debugHtml);
      
    } else if (url.pathname === '/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        browserReady,
        pageReady,
        sessionActive,
        qrAvailable: !!currentQrBuffer,
        lastError,
        lastQrCapture,
        timestamp: Date.now()
      }));
      
    } else if (url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        browser: !!browser,
        page: !!page,
        browserReady,
        pageReady,
        sessionActive,
        qrAvailable: !!currentQrBuffer,
        timestamp: Date.now()
      }));
      
    } else if (url.pathname === '/connected') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>✅ WhatsApp Conectado</h1><p>La sesión está activa.</p><a href="/">Volver</a>');
      
    } else {
      res.writeHead(404);
      res.end('404');
    }
  } catch (err) {
    error('Error manejando solicitud HTTP', err);
    res.writeHead(500);
    res.end('Error interno');
  }
});

// Iniciar servidor
async function start() {
  log('🚀 Iniciando WhatsApp QR Robust Server...');
  
  server.listen(PORT, () => {
    log(`✅ Servidor HTTP en http://localhost:${PORT}`);
    
    // Enviar IP pública a Telegram
    execAsync('curl -s ifconfig.me || hostname -I | awk \'{print $1}\'')
      .then(({ stdout }) => {
        const ip = stdout.trim();
        sendTelegramMessage(
          `🚀 WhatsApp QR Server (robust) iniciado\n\n` +
          `📱 URL local: http://localhost:8080\n` +
          `🌐 IP del servidor: ${ip}\n\n` +
          `Para SSH tunnel:\n` +
          `ssh -L 8081:localhost:8080 ubuntu@${ip}\n` +
          `Luego http://localhost:8081`
        );
      })
      .catch(() => {
        sendTelegramMessage('🚀 WhatsApp QR Server (robust) iniciado\n\nURL: http://localhost:8080');
      });
  });
  
  // Iniciar loop de captura después de 3 segundos
  setTimeout(() => {
    startCaptureLoop().catch(err => {
      error('Error en loop de captura principal', err);
    });
  }, 3000);
}

// Manejar cierre
process.on('SIGINT', async () => {
  log('\n🛑 Cerrando servidor...');
  if (browser) {
    try {
      await browser.close();
      log('✅ Browser cerrado');
    } catch (err) {
      error('Error cerrando browser', err);
    }
  }
  server.close();
  process.exit(0);
});

// Iniciar
start();
#!/usr/bin/env node

/**
 * WhatsApp QR Robust Server
 * Con mejor logging y diagnóstico
 */

const http = require('http');
const url = require('url');
const playwrightCore = require('/home/ubuntu/.nvm/versions/node/v24.14.1/lib/node_modules/openclaw/node_modules/playwright-core');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const PORT = 8080;
const USER_DATA_DIR = '/home/ubuntu/.openclaw/credentials/whatsapp/default';

// Estado global con logging
let browser = null;
let page = null;
let currentQrBuffer = null;
let qrLastUpdate = 0;
let sessionActive = false;
let browserState = 'not_initialized';
let lastError = null;

// Configuración de browser
const BROWSER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-accelerated-2d-canvas',
  '--no-first-run',
  '--no-zygote',
  '--disable-gpu',
  '--window-size=1280,800'
];

function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

function error(message, err = null) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ❌ ${message}`, err ? err.message : '');
  lastError = err ? err.message : message;
}

async function sendTelegramMessage(text) {
  try {
    const command = `curl -s -X POST "https://api.telegram.org/bot8799472381:AAGkpBP_oGE3lzghEFrHe_8CH2RVXu6LvIk/sendMessage" \
      -d "chat_id=5560884037" \
      -d "text=${encodeURIComponent(text)}"`;
    
    await execAsync(command);
  } catch (err) {
    error('Error enviando mensaje a Telegram', err);
  }
}

async function initializeBrowser() {
  if (browserState === 'initializing' || browserState === 'ready') {
    log('Browser ya está inicializando o listo');
    return;
  }
  
  browserState = 'initializing';
  log('🚀 Inicializando browser...');
  
  try {
    browser = await playwrightCore.chromium.launch({
      headless: true,
      args: BROWSER_ARGS,
      timeout: 60000
    });
    
    log('✅ Browser lanzado, creando contexto...');
    
    const context = await browser.newContext({
      userDataDir: USER_DATA_DIR,
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      javaScriptEnabled: true,
      bypassCSP: true
    });
    
    log('✅ Contexto creado, creando página...');
    
    page = await context.newPage();
    
    // Configurar timeout más largo
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(60000);
    
    log('🌐 Navegando a WhatsApp Web...');
    
    // Navegar con más opciones
    const response = await page.goto('https://web.whatsapp.com', {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    
    if (!response || !response.ok()) {
      throw new Error(`HTTP ${response ? response.status() : 'no response'} al cargar WhatsApp`);
    }
    
    log(`✅ WhatsApp Web cargado (status: ${response.status()})`);
    
    // Esperar más tiempo para que cargue completamente
    await page.waitForTimeout(10000);
    
    // Tomar screenshot inicial para diagnóstico
    const initialScreenshot = await page.screenshot({ fullPage: false });
    fs.writeFileSync('/tmp/whatsapp-initial.png', initialScreenshot);
    log('📸 Screenshot inicial guardado en /tmp/whatsapp-initial.png');
    
    browserState = 'ready';
    log('✅ Browser completamente inicializado y listo');
    
  } catch (err) {
    browserState = 'error';
    error('Error inicializando browser', err);
    
    // Intentar cerrar browser si existe
    if (browser) {
      try {
        await browser.close();
      } catch (closeErr) {
        error('Error cerrando browser después de fallo', closeErr);
      }
      browser = null;
      page = null;
    }
    
    throw err;
  }
}

async function captureQR() {
  if (browserState !== 'ready' || !page) {
    log('Browser no está listo para capturar QR');
    return false;
  }
  
  try {
    log('🔍 Buscando QR en WhatsApp Web...');
    
    // Primero verificar si la sesión ya está activa
    if (!sessionActive) {
      const sessionSelectors = [
        'div[data-testid="chat-list"]',
        'div[data-testid="conversation-panel"]',
        'div[aria-label="Chat list"]',
        'div[data-testid="intro-title"]' // "Keep your phone connected"
      ];
      
      for (const selector of sessionSelectors) {
        const element = await page.$(selector).catch(() => null);
        if (element) {
          log(`✅ Elemento de sesión encontrado: ${selector}`);
          sessionActive = true;
          await sendTelegramMessage('🎉 ¡WhatsApp CONECTADO! Sesión activa detectada.');
          return true;
        }
      }
    }
    
    if (sessionActive) {
      log('Sesión ya activa, no hay QR');
      return true;
    }
    
    // Buscar QR con múltiples selectores y timeout corto
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
          // Verificar que tenga tamaño
          const box = await qrElement.boundingBox().catch(() => null);
          if (box && box.width > 50 && box.height > 50) {
            foundSelector = selector;
            break;
          }
        }
      } catch (err) {
        // Continuar con siguiente selector
      }
    }
    
    if (!qrElement) {
      log('⚠️ No se encontró QR con los selectores habituales');
      
      // Tomar screenshot de diagnóstico
      const diagnosticScreenshot = await page.screenshot({ fullPage: false });
      fs.writeFileSync('/tmp/whatsapp-diagnostic.png', diagnosticScreenshot);
      log('📸 Screenshot diagnóstico guardado en /tmp/whatsapp-diagnostic.png');
      
      // Recargar página si ha pasado mucho tiempo
      if (Date.now() - qrLastUpdate > 45000) { // 45 segundos
        log('🔄 Recargando página (sin QR por mucho tiempo)...');
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(5000);
      }
      
      return false;
    }
    
    log(`🎯 QR encontrado con selector: ${foundSelector}`);
    
    // Capturar screenshot del QR
    currentQrBuffer = await qrElement.screenshot();
    qrLastUpdate = Date.now();
    
    log(`📸 QR capturado (${currentQrBuffer.length} bytes)`);
    return true;
    
  } catch (err) {
    error('Error capturando QR', err);
    return false;
  }
}

// HTML de la página principal mejorado
const htmlPage = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WhatsApp QR - OpenClaw</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
      color: white;
    }
    
    .container {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      padding: 40px;
      max-width: 600px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }
    
    h1 {
      font-size: 32px;
      margin-bottom: 10px;
      color: white;
    }
    
    .subtitle {
      font-size: 18px;
      opacity: 0.9;
      margin-bottom: 30px;
      line-height: 1.5;
    }
    
    .qr-section {
      margin: 30px 0;
    }
    
    .qr-container {
      padding: 20px;
      background: white;
      border-radius: 15px;
      display: inline-block;
      margin-bottom: 20px;
    }
    
    #qr-img {
      max-width: 300px;
      width: 100%;
      height: auto;
      border-radius: 10px;
    }
    
    .status {
      padding: 20px;
      border-radius: 15px;
      margin: 20px 0;
      font-weight: bold;
      font-size: 18px;
    }
    
    .status.waiting {
      background: rgba(255, 193, 7, 0.2);
      border: 2px solid #FFC107;
    }
    
    .status.connected {
      background: rgba(76, 175, 80, 0.2);
      border: 2px solid #4CAF50;
    }
    
    .status.error {
      background: rgba(244, 67, 54, 0.2);
      border: 2px solid #F44336;
    }
    
    .instructions {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 15px;
      padding: 25px;
      margin-top: 20px;
      text-align: left;
    }
    
    .instructions h3 {
      margin-bottom: 15px;
      font-size: 20px;
    }
    
    .instructions ol {
      margin-left: 25px;
      margin-bottom: 20px;
    }
    
    .instructions li {
      margin-bottom: 12px;
      line-height: 1.5;
      font-size: 16px;
    }
    
    .info {
      margin-top: 20px;
      font-size: 14px;
      opacity: 0.8;
    }
    
    .timer {
      margin-top: 15px;
      font-size: 14px;
      opacity: 0.8;
    }
    
    .debug-link {
      margin-top: 20px;
      font-size: 12px;
      opacity: 0.6;
    }
    
    .debug-link a {
      color: #FFC107;
      text-decoration: none;
    }
    
    .debug-link a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📱 WhatsApp QR - OpenClaw</h1>
    <p class="subtitle">Conecta WhatsApp para que OpenClaw pueda enviar y recibir mensajes</p>
    
    <div class="qr-section">
      <div class="qr-container">
        <img id="qr-img" src="/qr.png" alt="WhatsApp QR Code">
      </div>
      <div id="status" class="status waiting">
        ⏳ Inicializando... Por favor espera
      </div>
      <div class="timer">
        Última actualización: <span id="update-time">--:--:--</span>
      </div>
    </div>
    
    <div class="instructions">
      <h3>📋 Instrucciones paso a paso:</h3>
      <ol>
        <li><strong>Abre WhatsApp</strong> en tu teléfono</li>
        <li>Toca el <strong>menú (⋮)</strong> en la esquina superior derecha</li>
        <li>Selecciona <strong>"Linked Devices"</strong></li>
        <li>Toca <strong>"Link a Device"</strong></li>
        <li><strong>Escanea este código QR</strong> con la cámara de tu teléfono</li>
        <li>Espera a que WhatsApp confirme la conexión</li>
      </ol>
      <p><strong>⚠️ Nota:</strong> El QR se actualiza automáticamente cada 10 segundos.</p>
    </div>
    
    <div class="info">
      🔄 Esta página se actualiza automáticamente cada 5 segundos
    </div>
    
    <div class="debug-link">
      <a href="/debug" target="_blank">Ver información de diagnóstico</a>
    </div>
  </div>
  
  <script>
    function updatePage() {
      // Actualizar imagen del QR con timestamp para evitar cache
      const qrImg = document.getElementById('qr-img');
      const newSrc = '/qr.png?' + Date.now();
      qrImg.src = newSrc;
      
      // Actualizar timestamp
      const now = new Date();
      const timeStr = now.toLocaleTimeString('es-CL', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      });
      document.getElementById('update-time').textContent = timeStr;
      
      // Verificar estado
      fetch('/status')
        .then(response => response.json())
        .then(data => {
          const statusEl = document.getElementById('status');
          
          if (data.error) {
            statusEl.className = 'status error';
            statusEl.innerHTML = '❌ Error: ' + data.error;
          } else if (data.sessionActive) {
            statusEl.className = 'status connected';
            statusEl.innerHTML = '✅ ¡WhatsApp CONECTADO! Sesión activa.';
            
            // Redirigir después de 3 segundos
            setTimeout(() => {
              window.location.href = '/connected';
            }, 3000);
          } else if (data.qrAvailable) {
            statusEl.className = 'status waiting';
            statusEl.innerHTML = '⏳ Esperando escaneo... El QR se actualiza automáticamente';
          } else {
            statusEl.className = 'status waiting';
            statusEl.innerHTML = '🔄 Buscando QR... Por favor espera';
          }
        })
        .catch(error => {
          console.error('Error verificando estado:', error);
          document.getElementById('status').className = 'status error';
          document.getElementById('status').innerHTML = '❌ Error de conexión con el servidor';
        });
    }
    
    // Actualizar cada 5 segundos
    setInterval(updatePage, 5000);
    
    // Actualizar inmediatamente
    updatePage();
    
    // Actualizar cuando la página vuelve a estar visible
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        updatePage();
      }
    });
  </script>
</body>
</html>
`;

// Página de diagnóstico
const debugPage = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Diagnóstico - WhatsApp QR</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      margin: 0;
      padding: 20px;
      color: #333;
    }
    
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border-radius: 10px;
      padding: 30px;
      box-shadow: 0 5px 20px rgba(0,0,0,0.1);
    }
    
    h1, h2 {
      color: #25D366;
      margin-bottom: 20px;
    }
    
    .status-item {
      margin-bottom: 15px;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 8px;
      border-left: 4px solid #ddd;
    }
    
    .status-item.ok {
      border-left-color: #4CAF50;
      background: #e8f5e9;
    }
    
    .status-item.error {
      border-left-color: #F44336;
      background: #ffebee;
    }
    
    .status-item.warning {
      border-left-color: #FFC107;
      background: #fff8e1;
    }
    
    .label {
      font-weight: bold;
      margin-right: 10px;
      color: #555;
    }
    
    .value {
      font-family: monospace;
      color: #222;
    }
    
    .actions {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #eee;
    }
    
    .btn {
      display: inline-block;
      padding: 10px 20px;
      background: #25D366;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      margin-right: 10px;
      margin-bottom: 10px;
    }
    
    .btn:hover {
      background: #128C7E;
    }
    
    .btn.secondary {
      background: #607D8B;
    }
    
    .btn.secondary:hover {
      background: #455A64;
    }
    
    pre {
      background: #2d2d2d;
      color: #f8f8f2;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
      font-size: 14px;
    }
    
    .screenshot {
      margin-top: 20px;
      border: 1px solid #ddd;
      border-radius: 5px;
      padding: 10px;
      background: #f8f9fa;
    }
    
    .screenshot img {
      max-width: 100%;
      height: auto;
      border-radius: 3px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔧 Diagnóstico - WhatsApp QR Server</h1>
    
    <h2>Estado del Servidor</h2>
    
    <div id="status-container">
      <div class="status-item" id="server-status">
        <span class="label">Servidor HTTP:</span>
        <span class="value">Cargando...</span>
      </div>
      
      <div class="status-item" id="browser-status">
        <span class="label">Browser:</span>
        <span class="value">Cargando...</span>
      </div>
      
      <div class="status-item" id="whatsapp-status">
        <span class="label">WhatsApp Web:</span>
        <span class="value">Cargando...</span>
      </div>
      
      <div class="status-item" id="qr-status">
        <span class="label">QR disponible:</span>
        <span class="value">Cargando...</span>
      </div>
      
      <div class="status-item" id="session-status">
        <span class="label">Sesión activa:</span>
        <span class="value">Cargando...</span>
      </div>
    </div>
    
    <div class="screenshot">
      <h3>📸 Última captura:</h3>
      <div id="screenshot-container">
        <p>Cargando imagen...</p>
      </div>
    </div>
    
    <div class="actions">
      <a href="/" class="btn">← Volver al QR</a>
      <a href="/status" class="btn secondary">Ver JSON de estado</a>
      <a href="/health" class="btn secondary">Ver salud del servidor</a>
      <button onclick="refreshDiagnostic()" class="btn secondary">🔄 Actualizar diagnóstico</button>
    </div>
    
    <h2>Información técnica</h2>
    <pre id="tech-info">Cargando...</pre>
  </div>
  
  <script>
    function refreshDiagnostic() {
      fetch('/debug-data')
        .then(response => response.json())
        .then(data => {
          // Actualizar estados
          document.getElementById('server-status').className = 
            'status-item ' + (data.server === 'ok' ? 'ok' : 'error');
          document.getElementById('server-status').querySelector('.value').textContent = 
            data.server === 'ok' ? '✅ Funcionando' : '❌ Error';
          
          document.getElementById('browser-status').className = 
            'status-item ' + (data.browserReady ? 'ok' : data.browserState === 'initializing' ? 'warning' : 'error');
          document.getElementById('browser-status').querySelector('.value').textContent = 
            data.browserState + (data.lastError ? ' - ' + data.lastError : '');
          
          document.getElementById('whatsapp-status').className = 
            'status-item ' + (data.pageReady ? 'ok' : 'warning');
          document.getElementById('whatsapp-status').querySelector('.value').textContent = 
            data.pageReady ? '✅ Página cargada' : '⚠️ Cargando...';
          
          document.getElementById('qr-status').className = 
            'status-item ' + (data.qrAvailable ? 'ok' : 'warning');
          document.getElementById('qr-status').querySelector('.value').textContent = 
            data.qrAvailable ? '✅ Disponible' : '⚠️ No disponible';
          
          document.getElementById('session-status').className = 
            'status-item ' + (data.sessionActive ? 'ok' : 'warning');
          document.getElementById('session-status').querySelector('.value').textContent = 
            data.sessionActive ? '✅ Conectada' : '⏳ Esperando escaneo';
          
          // Mostrar screenshot si existe
          const screenshotContainer = document.getElementById('screenshot-container');
          if (data.screenshotPath && data.screenshotPath !== 'none') {
            screenshotContainer.innerHTML = \`<img src="\${data.screenshotPath}" alt="Screenshot diagnóstico">\`;
          } else {
            screenshotContainer.innerHTML = '<p>No hay screenshot disponible</p>';
          }
          
          // Mostrar información técnica
          document.getElementById('tech-info').textContent = JSON.stringify(data, null, 2);
        })
        .catch(error => {
          console.error('Error cargando diagnóstico:', error);
          document.getElementById('server-status').className = 'status-item error';
          document.getElementById('server-status').querySelector('.value').textContent = '❌ Error de conexión';
        });
    }
    
    // Cargar diagnóstico inicial
    refreshDiagnostic();
    
    // Actualizar cada 10 segundos
    setInterval(refreshDiagnostic, 10000);
  </script>
</body>
</html>
`;

// Crear servidor HTTP
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  // Configurar CORS y headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  try {
    // Rutas
    if (pathname === '/') {
      // Página principal
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(htmlPage);
      
    } else if (pathname === '/qr.png') {
      // Imagen del QR
      if (currentQrBuffer && !sessionActive) {
        res.writeHead(200, {
          'Content-Type': 'image/png',
          'Content-Length': currentQrBuffer.length
        });
        res.end(currentQrBuffer);
      } else if (sessionActive) {
        // QR placeholder cuando la sesión está activa
        const placeholder = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          'base64'
        );
        res.writeHead(200, {
          'Content-Type': 'image/png',
          'Content-Length': placeholder.length
        });
        res.end(placeholder);
      } else {
        // No hay QR disponible
        const noQr = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAQAAAAEAAQMAAABmrDolAAAABlBMVEX///8AAABVwtN+AAAA/ElEQVR42uyYSw7DMAgEe///tO0hSY2qplIOnjSJAcOyi8HS0tK/SQ+PJX7ABm8E1wQgAvcf8QDcAcF1AiwJqASAQYSAQgBCgH0C9gHu8d8RcE7AlwTsE7BPQH4bDQL2CMgn4L4AhoD7AhgC7gkgCKAIIAigCCAIoAggCKAIYAiwJ4AhwJ4AhgB7AhgC7AlgCLAngCHAngCGgHsCGALsCWAIoAhgCKAIYAigCGAIoAhgCKAIYAiwJ4AhwJ4AhgB7AhgC7AlgCLAngCHAngCGgHsCGALsCWAIoAhgCKAIYAigCGAIoAhgCKAIYAiwJ4AhwJ4AhgB7AhgC7AlgCLAngCHAngCGgHsCGALsCWAIwADUy10Bdw4y5gAAAABJRU5ErkJggg==',
          'base64'
        );
        res.writeHead(200, {
          'Content-Type': 'image/png',
          'Content-Length': noQr.length
        });
        res.end(noQr);
      }
      
    } else if (pathname === '/status') {
      // Estado JSON
      const status = {
        server: 'ok',
        browserReady: browserState === 'ready',
        browserState: browserState,
        pageReady: !!page,
        qrAvailable: !!currentQrBuffer,
        sessionActive: sessionActive,
        lastUpdate: qrLastUpdate,
        timestamp: Date.now(),
        error: lastError
      };
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(status));
      
    } else if (pathname === '/health') {
      // Salud del servidor
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        timestamp: Date.now(),
        uptime: process.uptime(),
        browser: {
          state: browserState,
          ready: browserState === 'ready',
          hasPage: !!page
        },
        whatsapp: {
          qrAvailable: !!currentQrBuffer,
          sessionActive: sessionActive
        }
      }));
      
    } else if (pathname === '/debug') {
      // Página de diagnóstico
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(debugPage);
      
    } else if (pathname === '/debug-data') {
      // Datos de diagnóstico
      const screenshotPath = fs.existsSync('/tmp/whatsapp-diagnostic.png') 
        ? '/diagnostic-screenshot'
        : (fs.existsSync('/tmp/whatsapp-initial.png') ? '/initial-screenshot' : 'none');
      
      const debugData = {
        server: 'ok',
        browserReady: browserState === 'ready',
        browserState: browserState,
        pageReady: !!page,
        qrAvailable: !!currentQrBuffer,
        sessionActive: sessionActive,
        lastError: lastError,
        lastUpdate: qrLastUpdate,
        screenshotPath: screenshotPath,
        timestamp: Date.now()
      };
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(debugData));
      
    } else if (pathname === '/diagnostic-screenshot') {
      // Screenshot diagnóstico
      if (fs.existsSync('/tmp/whatsapp-diagnostic.png')) {
        const screenshot = fs.readFileSync('/tmp/whatsapp-diagnostic.png');
        res.writeHead(200, {
          'Content-Type': 'image/png',
          'Content-Length': screenshot.length
        });
        res.end(screenshot);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Screenshot no disponible');
      }
      
    } else if (pathname === '/initial-screenshot') {
      // Screenshot inicial
      if (fs.existsSync('/tmp/whatsapp-initial.png')) {
        const screenshot = fs.readFileSync('/tmp/whatsapp-initial.png');
        res.writeHead(200, {
          'Content-Type': 'image/png',
          'Content-Length': screenshot.length
        });
        res.end(screenshot);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Screenshot inicial no disponible');
      }
      
    } else if (pathname === '/connected') {
      // Página de conexión exitosa
      const connectedPage = `
      <!DOCTYPE html>
      <html>
      <head><title>¡Conectado!</title></head>
      <body style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h1 style="color: #25D366;">✅ ¡WhatsApp Conectado!</h1>
        <p>La sesión se ha establecido exitosamente.</p>
        <p>OpenClaw ahora puede usar WhatsApp.</p>
        <p><a href="/">Volver</a></p>
      </body>
      </html>
      `;
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(connectedPage);
      
    } else {
      // 404
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 - No encontrado');
    }
  } catch (err) {
    error('Error manejando solicitud HTTP', err);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Error interno del servidor');
  }
});

// Iniciar servidor y captura
async function startServer() {
  log('🚀 Iniciando WhatsApp QR Robust Server...');
  log(`📁 Directorio de sesión: ${USER_DATA_DIR}`);
  
  try {
    // Iniciar servidor HTTP
    server.listen(PORT, () => {
      log(`✅ Servidor HTTP iniciado en puerto ${PORT}`);
      log(`🌐 Accesible en: http://localhost:${PORT}`);
      
      // Enviar mensaje a Telegram con la IP pública
      execAsync('curl -s ifconfig.me || hostname -I | awk \'{print $1}\'')
        .then(({ stdout }) => {
          const ip = stdout.trim();
          sendTelegramMessage(
            `🚀 WhatsApp QR Server reiniciado\n\n` +
            `📱 URL local: http://localhost:8080\n` +
            `🌐 IP del servidor: ${ip}\n\n` +
            `Para acceder remotamente:\n` +
            \`ssh -L 8080:localhost:8080 ubuntu@\${ip}\` +
            \`\n\nLuego abre http://localhost:8080 en tu navegador\`
          );
        })
        .catch(() => {
          sendTelegramMessage(
            `🚀 WhatsApp QR Server reiniciado\n\n` +
            `📱 URL: http://localhost:8080\n\n` +
            `Usa SSH tunnel para acceder remotamente.`
          );
        });
    });
    
    // Inicializar browser en segundo plano
    setTimeout(async () => {
      try {
        await initializeBrowser();
        
        // Iniciar captura periódica
        setInterval(async () => {
          if (!sessionActive && browserState === 'ready') {
            await captureQR();
          }
        }, 10000); // Cada 10 segundos
        
        log('🔄 Captura periódica configurada (cada 10s)');
        
      } catch (err) {
        error('Error inicializando browser o captura', err);
      }
    }, 2000); // Esperar 2 segundos antes de inicializar browser
    
  } catch (err) {
    error('Error iniciando servidor', err);
    process.exit(1);
  }
}

// Manejo de cierre limpio
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

// Ejecutar
if (require.main === module) {
  startServer();
}

module.exports = { server, startServer };
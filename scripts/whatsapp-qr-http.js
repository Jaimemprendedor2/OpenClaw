#!/usr/bin/env node

/**
 * WhatsApp QR HTTP Server - Native Node.js
 * Servidor web simple sin dependencias externas
 * Muestra QR en tiempo real con auto-refresh
 */

const http = require('http');
const url = require('url');
const playwrightCore = require('/home/ubuntu/.nvm/versions/node/v24.14.1/lib/node_modules/openclaw/node_modules/playwright-core');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const USER_DATA_DIR = '/home/ubuntu/.openclaw/credentials/whatsapp/default';

// Estado global
let browser = null;
let page = null;
let currentQrBuffer = null;
let qrLastUpdate = 0;
let sessionActive = false;

// Configuración de browser
const BROWSER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox'
];

async function initializeBrowser() {
  console.log('🚀 Inicializando browser...');
  
  browser = await playwrightCore.chromium.launch({
    headless: true,
    args: BROWSER_ARGS
  });
  
  const context = await browser.newContext({
    userDataDir: USER_DATA_DIR,
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  page = await context.newPage();
  
  console.log('🌐 Cargando WhatsApp Web...');
  await page.goto('https://web.whatsapp.com', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  
  await page.waitForTimeout(5000);
  console.log('✅ Browser listo');
}

async function captureQR() {
  if (!page) return false;
  
  try {
    // Verificar si la sesión ya está activa
    if (!sessionActive) {
      const sessionElements = [
        'div[data-testid="chat-list"]',
        'div[data-testid="conversation-panel"]',
        'div[aria-label="Chat list"]'
      ];
      
      for (const selector of sessionElements) {
        const exists = await page.$(selector).then(el => !!el).catch(() => false);
        if (exists) {
          sessionActive = true;
          console.log('✅ Sesión de WhatsApp activa detectada!');
          return true;
        }
      }
    }
    
    if (sessionActive) return true;
    
    // Buscar QR
    const qrSelectors = [
      'canvas[aria-label="Scan me!"]',
      'div[data-ref] canvas',
      'div[data-testid="qrcode"] canvas',
      'canvas'
    ];
    
    let qrElement = null;
    for (const selector of qrSelectors) {
      qrElement = await page.$(selector).catch(() => null);
      if (qrElement) {
        // Verificar que el elemento tenga tamaño real
        const box = await qrElement.boundingBox().catch(() => null);
        if (box && box.width > 50 && box.height > 50) {
          break;
        }
      }
      qrElement = null;
    }
    
    if (!qrElement) {
      // Recargar página si no hay QR después de 30 segundos
      if (Date.now() - qrLastUpdate > 30000) {
        console.log('🔄 Recargando página (sin QR detectado)...');
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(3000);
      }
      return false;
    }
    
    // Capturar screenshot del QR
    currentQrBuffer = await qrElement.screenshot();
    qrLastUpdate = Date.now();
    
    console.log(`📸 QR capturado (${currentQrBuffer.length} bytes)`);
    return true;
    
  } catch (error) {
    console.error('❌ Error capturando QR:', error.message);
    return false;
  }
}

// Iniciar captura periódica
async function startPeriodicCapture() {
  await initializeBrowser();
  
  // Captura inicial
  await captureQR();
  
  // Capturar cada 10 segundos
  setInterval(async () => {
    if (!sessionActive) {
      await captureQR();
    }
  }, 10000);
}

// HTML de la página principal
const htmlPage = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WhatsApp QR - Tiempo Real</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f0f2f5;
      margin: 0;
      padding: 20px;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    
    .container {
      background: white;
      border-radius: 20px;
      padding: 40px;
      max-width: 500px;
      width: 100%;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
      text-align: center;
    }
    
    h1 {
      color: #25D366;
      margin-bottom: 10px;
      font-size: 28px;
    }
    
    .subtitle {
      color: #666;
      margin-bottom: 30px;
      font-size: 16px;
      line-height: 1.5;
    }
    
    .qr-container {
      margin: 30px 0;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 15px;
      display: inline-block;
    }
    
    #qr-img {
      max-width: 300px;
      width: 100%;
      height: auto;
      border-radius: 10px;
      border: 2px solid #ddd;
    }
    
    .status {
      padding: 15px;
      border-radius: 10px;
      margin: 20px 0;
      font-weight: bold;
    }
    
    .status.waiting {
      background: #fff3cd;
      color: #856404;
      border: 1px solid #ffeaa7;
    }
    
    .status.connected {
      background: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }
    
    .instructions {
      text-align: left;
      background: #f8f9fa;
      padding: 20px;
      border-radius: 10px;
      margin-top: 20px;
    }
    
    .instructions h3 {
      margin-top: 0;
      color: #333;
    }
    
    .instructions ol {
      margin-left: 20px;
      margin-bottom: 0;
    }
    
    .instructions li {
      margin-bottom: 10px;
      line-height: 1.4;
    }
    
    .timer {
      margin-top: 15px;
      font-size: 14px;
      color: #666;
    }
    
    .refresh-info {
      margin-top: 15px;
      font-size: 14px;
      color: #666;
    }
    
    .note {
      margin-top: 20px;
      font-size: 12px;
      color: #999;
      font-style: italic;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📱 WhatsApp QR</h1>
    <p class="subtitle">Escanea este código en WhatsApp para conectar OpenClaw</p>
    
    <div class="qr-container">
      <img id="qr-img" src="/qr.png" alt="WhatsApp QR Code">
    </div>
    
    <div id="status" class="status waiting">
      ⏳ Esperando escaneo... El QR se actualiza automáticamente
    </div>
    
    <div class="timer">
      Última actualización: <span id="update-time">Justo ahora</span>
    </div>
    
    <div class="refresh-info">
      🔄 Actualización automática cada 5 segundos
    </div>
    
    <div class="instructions">
      <h3>📋 Instrucciones:</h3>
      <ol>
        <li><strong>Abre WhatsApp</strong> en tu teléfono</li>
        <li>Toca <strong>⋮ (menú)</strong> → <strong>Linked Devices</strong></li>
        <li><strong>Escanea este código QR</strong></li>
        <li>Espera a que la página detecte la conexión</li>
      </ol>
      <p><strong>⚠️ Nota:</strong> El QR expira en ~30 segundos pero se renueva automáticamente.</p>
    </div>
    
    <div class="note">
      Servidor WhatsApp QR - OpenClaw | Tiempo real
    </div>
  </div>
  
  <script>
    function updatePage() {
      // Actualizar imagen del QR con timestamp para evitar cache
      const qrImg = document.getElementById('qr-img');
      qrImg.src = '/qr.png?' + Date.now();
      
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
          if (data.sessionActive) {
            statusEl.className = 'status connected';
            statusEl.innerHTML = '✅ ¡WhatsApp CONECTADO! Sesión activa.';
            
            // Redirigir después de 2 segundos
            setTimeout(() => {
              window.location.href = '/connected';
            }, 2000);
          } else {
            statusEl.className = 'status waiting';
            statusEl.innerHTML = '⏳ Esperando escaneo... El QR se actualiza automáticamente';
          }
        })
        .catch(error => {
          console.error('Error verificando estado:', error);
        });
    }
    
    // Actualizar cada 5 segundos
    setInterval(updatePage, 5000);
    
    // Actualizar al cargar
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

// Página de conexión exitosa
const connectedPage = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>¡Conectado!</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #25D366;
      margin: 0;
      padding: 20px;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      color: white;
      text-align: center;
    }
    
    .container {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      padding: 40px;
      max-width: 500px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }
    
    .checkmark {
      font-size: 80px;
      margin-bottom: 30px;
      animation: bounce 1s infinite alternate;
    }
    
    @keyframes bounce {
      from { transform: translateY(0); }
      to { transform: translateY(-10px); }
    }
    
    h1 {
      font-size: 36px;
      margin-bottom: 20px;
    }
    
    p {
      font-size: 18px;
      line-height: 1.6;
      margin-bottom: 20px;
      opacity: 0.9;
    }
    
    .steps {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 15px;
      padding: 20px;
      margin-top: 30px;
      text-align: left;
    }
    
    .steps h3 {
      margin-bottom: 15px;
      font-size: 20px;
    }
    
    .steps ul {
      margin-left: 20px;
    }
    
    .steps li {
      margin-bottom: 10px;
      line-height: 1.4;
    }
    
    .close-btn {
      margin-top: 30px;
      padding: 15px 30px;
      background: white;
      color: #25D366;
      border: none;
      border-radius: 50px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      transition: transform 0.2s;
    }
    
    .close-btn:hover {
      transform: translateY(-2px);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="checkmark">✅</div>
    <h1>¡WhatsApp Conectado!</h1>
    <p>La sesión se ha establecido exitosamente.</p>
    <p>OpenClaw ahora puede acceder a WhatsApp a través de esta sesión persistente.</p>
    
    <div class="steps">
      <h3>🎯 Próximos pasos:</h3>
      <ul>
        <li>La sesión se guardó automáticamente en el servidor</li>
        <li>OpenClaw reiniciará para usar la nueva sesión</li>
        <li>Podrás enviar y recibir mensajes de WhatsApp</li>
        <li>No necesitarás escanear el QR nuevamente</li>
      </ul>
    </div>
    
    <button class="close-btn" onclick="window.close()">Cerrar esta ventana</button>
  </div>
</body>
</html>
`;

// Crear servidor HTTP
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
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
        'Content-Length': currentQrBuffer.length,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
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
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('QR no disponible');
    }
    
  } else if (pathname === '/status') {
    // Estado JSON
    const status = {
      qrAvailable: !!currentQrBuffer,
      sessionActive: sessionActive,
      lastUpdate: qrLastUpdate,
      timestamp: Date.now()
    };
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(status));
    
  } else if (pathname === '/connected') {
    // Página de conexión exitosa
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(connectedPage);
    
  } else if (pathname === '/health') {
    // Salud del servidor
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      browser: !!browser,
      page: !!page,
      sessionActive: sessionActive,
      timestamp: Date.now()
    }));
    
  } else {
    // 404
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 - No encontrado');
  }
});

// Iniciar servidor
async function startServer() {
  try {
    // Iniciar captura en segundo plano
    startPeriodicCapture().catch(error => {
      console.error('Error inicializando captura:', error);
    });
    
    server.listen(PORT, () => {
      console.log(`🚀 Servidor WhatsApp QR iniciado en http://localhost:${PORT}`);
      console.log(`📱 Accede desde tu navegador para ver el QR en tiempo real`);
      console.log(`🔗 Para acceder remotamente, usa SSH tunnel:`);
      console.log(`   ssh -L 8080:localhost:${PORT} usuario@servidor`);
      console.log(`   Luego abre http://localhost:8080 en tu navegador`);
      console.log(`🔄 El QR se actualiza automáticamente cada 10 segundos`);
    });
    
  } catch (error) {
    console.error('💥 Error iniciando servidor:', error);
    process.exit(1);
  }
}

// Manejo de cierre limpio
process.on('SIGINT', async () => {
  console.log('\n🛑 Cerrando servidor...');
  if (browser) {
    await browser.close();
    console.log('✅ Browser cerrado');
  }
  server.close();
  process.exit(0);
});

// Ejecutar
if (require.main === module) {
  startServer();
}

module.exports = { server, startServer };
#!/usr/bin/env node

/**
 * WhatsApp QR Real-Time Server
 * Servidor web que muestra el QR en tiempo real con actualización automática
 * Elimina completamente el delay de Telegram
 */

const express = require('express');
const playwrightCore = require('/home/ubuntu/.nvm/versions/node/v24.14.1/lib/node_modules/openclaw/node_modules/playwright-core');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const USER_DATA_DIR = '/home/ubuntu/.openclaw/credentials/whatsapp/default';

// Variables globales
let browser = null;
let page = null;
let currentQrBase64 = null;
let lastQrHash = null;
let qrUpdateTime = null;
let isSessionActive = false;

// Configuración de browser optimizada
const BROWSER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-extensions',
  '--disable-background-networking',
  '--disable-default-apps',
  '--disable-sync',
  '--hide-scrollbars',
  '--mute-audio',
  '--no-first-run',
  '--no-zygote'
];

async function initializeBrowser() {
  console.log('🚀 Inicializando browser para servidor QR...');
  
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
    timeout: 20000 
  });
  
  await page.waitForTimeout(3000);
  console.log('✅ Browser inicializado para servidor');
}

async function captureQR() {
  if (!page) {
    console.error('Page no inicializada');
    return null;
  }
  
  try {
    // Buscar QR rápidamente
    const qrSelectors = [
      'canvas[aria-label="Scan me!"]',
      'div[data-ref] canvas',
      'div[data-testid="qrcode"] canvas',
      'canvas'
    ];
    
    let qrElement = null;
    for (const selector of qrSelectors) {
      qrElement = await page.$(selector).catch(() => null);
      if (qrElement) break;
    }
    
    if (!qrElement) {
      // Verificar si la sesión está activa
      const sessionSelectors = [
        'div[data-testid="chat-list"]',
        'div[data-testid="conversation-panel"]'
      ];
      
      for (const selector of sessionSelectors) {
        const exists = await page.$(selector).then(el => !!el).catch(() => false);
        if (exists) {
          isSessionActive = true;
          return null;
        }
      }
      
      // Si no hay QR ni sesión, recargar
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 10000 });
      await page.waitForTimeout(2000);
      return null;
    }
    
    // Capturar screenshot como base64
    const buffer = await qrElement.screenshot();
    const base64 = buffer.toString('base64');
    
    // Calcular hash para detectar cambios
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(buffer).digest('hex');
    
    if (hash !== lastQrHash) {
      lastQrHash = hash;
      currentQrBase64 = base64;
      qrUpdateTime = Date.now();
      console.log(`🆕 Nuevo QR capturado (hash: ${hash.substring(0, 8)}...)`);
    }
    
    return base64;
    
  } catch (error) {
    console.error('Error capturando QR:', error.message);
    return null;
  }
}

// Inicializar browser y comenzar captura periódica
async function startQRCapture() {
  await initializeBrowser();
  
  // Capturar QR inicial
  await captureQR();
  
  // Programar captura periódica cada 10 segundos
  setInterval(async () => {
    if (!isSessionActive) {
      await captureQR();
    }
  }, 10000);
  
  console.log(`🔄 Captura periódica configurada (cada 10s)`);
}

// Middleware para servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Ruta principal - Página web con QR en tiempo real
app.get('/', (req, res) => {
  const html = `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WhatsApp QR - Tiempo Real</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
        max-width: 500px;
        width: 100%;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      }
      
      h1 {
        font-size: 28px;
        margin-bottom: 10px;
        color: white;
      }
      
      .subtitle {
        font-size: 16px;
        opacity: 0.9;
        margin-bottom: 30px;
        line-height: 1.5;
      }
      
      .qr-container {
        margin: 30px 0;
        padding: 20px;
        background: white;
        border-radius: 15px;
        display: inline-block;
      }
      
      #qr-image {
        max-width: 300px;
        width: 100%;
        height: auto;
        border-radius: 10px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
      }
      
      .instructions {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 15px;
        padding: 20px;
        margin-top: 20px;
        text-align: left;
      }
      
      .instructions ol {
        margin-left: 20px;
        margin-bottom: 15px;
      }
      
      .instructions li {
        margin-bottom: 10px;
        line-height: 1.4;
      }
      
      .status {
        margin-top: 20px;
        padding: 15px;
        border-radius: 10px;
        font-weight: bold;
      }
      
      .status.active {
        background: rgba(76, 175, 80, 0.2);
        border: 2px solid #4CAF50;
      }
      
      .status.waiting {
        background: rgba(255, 193, 7, 0.2);
        border: 2px solid #FFC107;
      }
      
      .timer {
        font-size: 14px;
        opacity: 0.8;
        margin-top: 10px;
      }
      
      .auto-refresh {
        margin-top: 20px;
        font-size: 14px;
        opacity: 0.8;
      }
      
      .note {
        margin-top: 20px;
        font-size: 12px;
        opacity: 0.7;
        font-style: italic;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>📱 WhatsApp QR - Tiempo Real</h1>
      <p class="subtitle">Escanea este código en WhatsApp para conectar OpenClaw</p>
      
      <div id="qr-container" class="qr-container">
        <img id="qr-image" src="/qr-image" alt="WhatsApp QR Code">
      </div>
      
      <div id="status" class="status waiting">
        ⏳ Esperando escaneo... El QR se actualiza automáticamente
      </div>
      
      <div class="timer">
        Última actualización: <span id="last-update">Justo ahora</span>
      </div>
      
      <div class="auto-refresh">
        🔄 La página se actualiza automáticamente cada 5 segundos
      </div>
      
      <div class="instructions">
        <h3>📋 Instrucciones:</h3>
        <ol>
          <li><strong>Abre WhatsApp</strong> en tu teléfono</li>
          <li><strong>Toca ⋮ (menú)</strong> → <strong>Linked Devices</strong></li>
          <li><strong>Escanea este código QR</strong> con la cámara</li>
          <li><strong>Espera</strong> a que la página detecte la conexión</li>
        </ol>
        <p><strong>⚠️ Importante:</strong> El QR expira en ~30 segundos, pero se renueva automáticamente.</p>
      </div>
      
      <div class="note">
        Servidor WhatsApp QR - OpenClaw | Actualizado automáticamente
      </div>
    </div>
    
    <script>
      let lastUpdateTime = Date.now();
      
      // Función para actualizar el QR y la UI
      function updateQR() {
        // Actualizar imagen del QR con timestamp para evitar cache
        const qrImage = document.getElementById('qr-image');
        qrImage.src = '/qr-image?' + Date.now();
        
        // Actualizar timestamp
        const now = new Date();
        document.getElementById('last-update').textContent = 
          now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        // Verificar estado de sesión
        fetch('/status')
          .then(response => response.json())
          .then(data => {
            if (data.sessionActive) {
              document.getElementById('status').className = 'status active';
              document.getElementById('status').innerHTML = '✅ ¡WhatsApp CONECTADO! Sesión activa.';
              
              // Redirigir después de 3 segundos
              setTimeout(() => {
                window.location.href = '/success';
              }, 3000);
            } else {
              document.getElementById('status').className = 'status waiting';
              document.getElementById('status').innerHTML = 
                '⏳ Esperando escaneo... El QR se actualiza automáticamente';
            }
          })
          .catch(error => {
            console.error('Error verificando estado:', error);
          });
      }
      
      // Actualizar cada 5 segundos
      setInterval(updateQR, 5000);
      
      // Actualizar inmediatamente al cargar
      updateQR();
      
      // También actualizar cuando la página gana foco
      window.addEventListener('focus', updateQR);
      
      // Actualizar cada minuto incluso si la pestaña está inactiva
      setInterval(() => {
        if (document.hidden) {
          updateQR();
        }
      }, 60000);
    </script>
  </body>
  </html>
  `;
  
  res.send(html);
});

// Ruta para obtener la imagen del QR
app.get('/qr-image', (req, res) => {
  if (currentQrBase64) {
    const img = Buffer.from(currentQrBase64, 'base64');
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': img.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.end(img);
  } else if (isSessionActive) {
    // Si la sesión está activa, mostrar mensaje
    const img = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': img.length
    });
    res.end(img);
  } else {
    res.status(404).send('QR no disponible');
  }
});

// Ruta para verificar estado
app.get('/status', (req, res) => {
  res.json({
    qrAvailable: !!currentQrBase64,
    qrUpdated: qrUpdateTime,
    sessionActive: isSessionActive,
    serverTime: Date.now()
  });
});

// Ruta de éxito cuando se conecta
app.get('/success', (req, res) => {
  const html = `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>¡WhatsApp Conectado!</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%);
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
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
      
      h1 {
        font-size: 36px;
        margin-bottom: 20px;
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
      
      p {
        font-size: 18px;
        line-height: 1.6;
        margin-bottom: 20px;
        opacity: 0.9;
      }
      
      .next-steps {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 15px;
        padding: 20px;
        margin-top: 30px;
        text-align: left;
      }
      
      .next-steps h3 {
        margin-bottom: 15px;
        font-size: 20px;
      }
      
      .next-steps ul {
        margin-left: 20px;
      }
      
      .next-steps li {
        margin-bottom: 10px;
        line-height: 1.4;
      }
      
      .close-btn {
        margin-top: 30px;
        padding: 15px 30px;
        background: white;
        color: #2E7D32;
        border: none;
        border-radius: 50px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
      }
      
      .close-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="checkmark">✅</div>
      <h1>¡WhatsApp Conectado!</h1>
      <p>La sesión de WhatsApp se ha establecido exitosamente.</p>
      <p>OpenClaw ahora puede acceder a WhatsApp a través de esta sesión persistente.</p>
      
      <div class="next-steps">
        <h3>🎯 Próximos pasos:</h3>
        <ul>
          <li>La sesión se guardó automáticamente en el servidor</li>
          <li>OpenClaw reiniciará el gateway para usar la nueva sesión</li>
          <li>Podrás enviar y recibir mensajes de WhatsApp a través de OpenClaw</li>
          <li>No necesitarás escanear el QR nuevamente al reiniciar</li>
        </ul>
      </div>
      
      <button class="close-btn" onclick="window.close()">Cerrar esta ventana</button>
    </div>
  </body>
  </html>
  `;
  
  res.send(html);
});

// Ruta de salud
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    qrAvailable: !!currentQrBase64,
    sessionActive: isSessionActive,
    browserInitialized: !!browser
  });
});

// Iniciar servidor y captura de QR
async function startServer() {
  try {
    // Iniciar captura de QR en segundo plano
    startQRCapture().catch(error => {
      console.error('Error inicializando captura QR:', error);
    });
    
    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`🚀 Servidor WhatsApp QR iniciado en http://localhost:${PORT}`);
      console.log(`📱 Accede desde tu navegador para ver el QR en tiempo real`);
      console.log(`🔗 O usa SSH tunnel: ssh -L 8080:localhost:${PORT} usuario@servidor`);
      console.log(`🔄 El QR se actualiza automáticamente cada 10 segundos`);
    });
    
  } catch (error) {
    console.error('💥 Error iniciando servidor:', error);
    process.exit(1);
  }
}

// Manejo de cierre limpio
process.on('SIGINT', async () => {
  console.log('\n🛑 Cerrando servidor WhatsApp QR...');
  if (browser) {
    await browser.close();
    console.log('✅ Browser cerrado');
  }
  process.exit(0);
});

// Ejecutar
if (require.main === module) {
  startServer();
}

module.exports = { app, captureQR, startQRCapture };
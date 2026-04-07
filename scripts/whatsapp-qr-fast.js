#!/usr/bin/env node

/**
 * WhatsApp QR Fast Capture - Minimal delay version
 * Mantiene browser abierto, captura y envía en < 5 segundos
 */

const playwrightCore = require('/home/ubuntu/.nvm/versions/node/v24.14.1/lib/node_modules/openclaw/node_modules/playwright-core');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const TELEGRAM_BOT_TOKEN = '8799472381:AAGkpBP_oGE3lzghEFrHe_8CH2RVXu6LvIk';
const TELEGRAM_CHAT_ID = '5560884037';
const USER_DATA_DIR = '/home/ubuntu/.openclaw/credentials/whatsapp/default';
const CAPTURE_INTERVAL = 15000; // 15 segundos (más rápido que los 30s de expiración)
const MAX_ATTEMPTS = 100;

// Configuración de browser para máxima velocidad
const BROWSER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-extensions',
  '--disable-background-networking',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-breakpad',
  '--disable-client-side-phishing-detection',
  '--disable-component-update',
  '--disable-default-apps',
  '--disable-domain-reliability',
  '--disable-features=AudioServiceOutOfProcess',
  '--disable-hang-monitor',
  '--disable-ipc-flooding-protection',
  '--disable-notifications',
  '--disable-offer-store-unmasked-wallet-cards',
  '--disable-popup-blocking',
  '--disable-print-preview',
  '--disable-prompt-on-repost',
  '--disable-renderer-backgrounding',
  '--disable-speech-api',
  '--disable-sync',
  '--hide-scrollbars',
  '--ignore-gpu-blacklist',
  '--metrics-recording-only',
  '--mute-audio',
  '--no-default-browser-check',
  '--no-first-run',
  '--no-pings',
  '--no-zygote',
  '--password-store=basic',
  '--use-gl=swiftshader',
  '--use-mock-keychain'
];

let browser = null;
let page = null;
let isInitialized = false;
let lastQrSent = null;
let sentCount = 0;

async function initializeBrowser() {
  console.log('🚀 Inicializando browser de alta velocidad...');
  
  browser = await playwrightCore.chromium.launch({
    headless: true,
    args: BROWSER_ARGS
  });
  
  const context = await browser.newContext({
    userDataDir: USER_DATA_DIR,
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    // Desactivar recursos innecesarios para mayor velocidad
    bypassCSP: true,
    javaScriptEnabled: true,
    acceptDownloads: false,
    hasTouch: false,
    isMobile: false,
    deviceScaleFactor: 1,
    offline: false
  });
  
  page = await context.newPage();
  
  // Navegar una vez y mantener la página
  console.log('🌐 Cargando WhatsApp Web...');
  await page.goto('https://web.whatsapp.com', { 
    waitUntil: 'domcontentloaded', // Más rápido que networkidle
    timeout: 20000 
  });
  
  // Esperar un momento para que cargue el QR inicial
  await page.waitForTimeout(3000);
  
  isInitialized = true;
  console.log('✅ Browser inicializado y listo para capturas rápidas');
}

async function sendTelegramPhoto(imagePath, attempt) {
  try {
    const caption = `📱 WhatsApp QR - Intento ${attempt}\n\n1. Abre WhatsApp → ⋮ → Linked Devices\n2. Escanea INMEDIATAMENTE\n3. Código nuevo en ~15s`;
    
    const command = `curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto" \
      -F "chat_id=${TELEGRAM_CHAT_ID}" \
      -F "photo=@${imagePath}" \
      -F "caption=${encodeURIComponent(caption)}"`;
    
    const startTime = Date.now();
    const { stdout } = await execAsync(command);
    const duration = Date.now() - startTime;
    
    console.log(`📤 QR enviado en ${duration}ms (Intento ${attempt})`);
    
    const result = JSON.parse(stdout);
    return result.ok;
  } catch (error) {
    console.error('❌ Error enviando QR:', error.message);
    return false;
  }
}

async function sendTelegramMessage(text) {
  try {
    const command = `curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -d "chat_id=${TELEGRAM_CHAT_ID}" \
      -d "text=${encodeURIComponent(text)}"`;
    
    await execAsync(command);
  } catch (error) {
    console.error('Error enviando mensaje:', error.message);
  }
}

async function captureQR(attempt) {
  if (!isInitialized || !page) {
    console.error('Browser no inicializado');
    return null;
  }
  
  try {
    const startTime = Date.now();
    
    // Intentar recargar la página si lleva mucho tiempo (para forzar QR nuevo)
    if (sentCount > 0 && sentCount % 3 === 0) {
      console.log('🔄 Recargando página para nuevo QR...');
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 10000 });
      await page.waitForTimeout(2000);
    }
    
    // Búsqueda ULTRA RÁPIDA del QR
    const qrSelectors = [
      'canvas[aria-label="Scan me!"]',
      'div[data-ref] canvas',
      'div[data-testid="qrcode"] canvas',
      'canvas'
    ];
    
    let qrElement = null;
    for (const selector of qrSelectors) {
      try {
        qrElement = await page.$(selector);
        if (qrElement) {
          console.log(`🎯 QR encontrado con selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Ignorar errores, continuar con siguiente selector
      }
    }
    
    if (!qrElement) {
      console.log('⚠️ No se encontró QR, tomando screenshot de página completa');
      const fullPath = `/tmp/whatsapp-full-${Date.now()}.png`;
      await page.screenshot({ path: fullPath, fullPage: false });
      return fullPath;
    }
    
    // Capturar QR con contenedor para mejor calidad
    const parent = await qrElement.$('xpath=..').catch(() => null);
    const elementToCapture = parent || qrElement;
    
    const imagePath = `/tmp/whatsapp-qr-${Date.now()}.png`;
    await elementToCapture.screenshot({ path: imagePath });
    
    const captureTime = Date.now() - startTime;
    console.log(`📸 QR capturado en ${captureTime}ms`);
    
    return imagePath;
    
  } catch (error) {
    console.error('❌ Error capturando QR:', error.message);
    return null;
  }
}

async function checkSessionActive() {
  if (!page) return false;
  
  try {
    // Verificar rápidamente si el QR desapareció (sesión activa)
    const qrExists = await page.$('canvas[aria-label="Scan me!"]').then(el => !!el).catch(() => false);
    
    if (!qrExists) {
      // Verificar elementos de sesión activa
      const sessionSelectors = [
        'div[data-testid="chat-list"]',
        'div[data-testid="conversation-panel"]',
        'div[aria-label="Chat list"]'
      ];
      
      for (const selector of sessionSelectors) {
        const exists = await page.$(selector).then(el => !!el).catch(() => false);
        if (exists) return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error verificando sesión:', error.message);
    return false;
  }
}

async function main() {
  console.log('⚡ WhatsApp QR Fast Capture iniciado');
  console.log(`📁 Sesión persistente en: ${USER_DATA_DIR}`);
  console.log(`⏱️  Intervalo de captura: ${CAPTURE_INTERVAL/1000}s`);
  
  await sendTelegramMessage('⚡ WhatsApp QR Fast Capture iniciado. Códigos cada ~15s.');
  
  try {
    await initializeBrowser();
    
    let attempts = 0;
    let sessionActive = false;
    
    while (attempts < MAX_ATTEMPTS && !sessionActive) {
      attempts++;
      sentCount++;
      
      console.log(`\n--- CAPTURA RÁPIDA ${attempts}/${MAX_ATTEMPTS} ---`);
      
      // Capturar QR
      const imagePath = await captureQR(attempts);
      
      if (imagePath && fs.existsSync(imagePath)) {
        // Enviar INMEDIATAMENTE sin verificaciones de hash
        await sendTelegramPhoto(imagePath, attempts);
        
        // Limpiar archivo
        fs.unlinkSync(imagePath);
        
        // Verificar rápidamente si la sesión se activó
        if (attempts % 2 === 0) { // No verificar cada vez para no ralentizar
          sessionActive = await checkSessionActive();
          if (sessionActive) {
            console.log('✅ ¡SESION ACTIVADA! QR escaneado exitosamente.');
            await sendTelegramMessage('🎉 ¡WhatsApp CONECTADO! Sesión activa y persistente.');
            break;
          }
        }
      }
      
      // Esperar para siguiente captura
      console.log(`⏱️  Esperando ${CAPTURE_INTERVAL/1000}s para siguiente QR...`);
      await page.waitForTimeout(CAPTURE_INTERVAL);
    }
    
    if (sessionActive) {
      console.log('✅ Sesión de WhatsApp lista para uso.');
      console.log(`📂 Sesión persistente guardada en: ${USER_DATA_DIR}`);
      
      // Cerrar browser ya que la sesión está activa
      if (browser) {
        await browser.close();
        console.log('✅ Browser cerrado, sesión guardada.');
      }
      
      // Reiniciar gateway para que OpenClaw use la sesión
      await sendTelegramMessage('🔄 Reiniciando OpenClaw para usar sesión WhatsApp...');
      try {
        await execAsync('openclaw gateway restart');
        console.log('✅ Gateway reiniciado.');
      } catch (error) {
        console.error('⚠️ Error reiniciando gateway:', error.message);
      }
      
    } else {
      console.log(`⏰ Tiempo agotado después de ${MAX_ATTEMPTS} intentos`);
      await sendTelegramMessage('⏰ WhatsApp QR capture terminado. Ejecuta de nuevo para reintentar.');
    }
    
  } catch (error) {
    console.error('💥 Error fatal:', error);
    await sendTelegramMessage(`❌ Error en WhatsApp QR capture: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  console.log('👋 WhatsApp QR Fast Capture finalizado');
}

// Ejecutar
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Error no manejado:', error);
    process.exit(1);
  });
}

module.exports = { initializeBrowser, captureQR, checkSessionActive };
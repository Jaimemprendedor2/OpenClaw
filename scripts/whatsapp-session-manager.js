#!/usr/bin/env node

const playwrightCore = require('/home/ubuntu/.nvm/versions/node/v24.14.1/lib/node_modules/openclaw/node_modules/playwright-core');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const TELEGRAM_BOT_TOKEN = '8799472381:AAGkpBP_oGE3lzghEFrHe_8CH2RVXu6LvIk';
const TELEGRAM_CHAT_ID = '5560884037';
const USER_DATA_DIR = '/home/ubuntu/.openclaw/credentials/whatsapp/default';
const CHECK_INTERVAL = 20000; // 20 segundos
const MAX_ATTEMPTS = 50; // ~16 minutos máximo

// Crear directorio si no existe
if (!fs.existsSync(USER_DATA_DIR)) {
  fs.mkdirSync(USER_DATA_DIR, { recursive: true });
  console.log(`Created user data dir: ${USER_DATA_DIR}`);
}

async function sendTelegramPhoto(imagePath, caption) {
  try {
    const command = `curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto" \
      -F "chat_id=${TELEGRAM_CHAT_ID}" \
      -F "photo=@${imagePath}" \
      -F "caption=${encodeURIComponent(caption)}"`;
    
    const { stdout, stderr } = await execAsync(command);
    if (stderr) console.error('Telegram stderr:', stderr);
    
    const result = JSON.parse(stdout);
    return result.ok;
  } catch (error) {
    console.error('Error sending photo:', error.message);
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
    console.error('Error sending message:', error.message);
  }
}

async function checkSessionActive(browser) {
  try {
    const context = await browser.newContext({
      userDataDir: USER_DATA_DIR,
      viewport: { width: 1280, height: 800 }
    });
    
    const page = await context.newPage();
    
    // Navegar rápidamente
    await page.goto('https://web.whatsapp.com', { 
      waitUntil: 'domcontentloaded', 
      timeout: 15000 
    });
    
    // Esperar un momento
    await page.waitForTimeout(3000);
    
    // Verificar elementos que indican sesión activa
    const selectors = [
      'div[data-testid="chat-list"]', // Lista de chats
      'div[data-testid="conversation-panel"]', // Panel de conversación
      'div[aria-label="Chat list"]', // Lista de chats alternativa
      'div[data-testid="intro-title"]' // "Keep your phone connected"
    ];
    
    let sessionActive = false;
    for (const selector of selectors) {
      const element = await page.$(selector).catch(() => null);
      if (element) {
        sessionActive = true;
        break;
      }
    }
    
    // También verificar si el QR está presente (si está, sesión NO activa)
    const qrSelectors = [
      'canvas[aria-label="Scan me!"]',
      'div[data-ref] canvas',
      'div[data-testid="qrcode"]'
    ];
    
    let qrPresent = false;
    for (const selector of qrSelectors) {
      const qr = await page.$(selector).catch(() => null);
      if (qr) {
        qrPresent = true;
        break;
      }
    }
    
    await context.close();
    
    return sessionActive && !qrPresent;
  } catch (error) {
    console.error('Error checking session:', error.message);
    return false;
  }
}

async function captureQR() {
  const browser = await playwrightCore.chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const context = await browser.newContext({
      userDataDir: USER_DATA_DIR, // Usar directorio persistente
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();
    
    await page.goto('https://web.whatsapp.com', { 
      waitUntil: 'networkidle', 
      timeout: 30000 
    });
    
    // Esperar a que cargue
    await page.waitForTimeout(5000);
    
    // Buscar QR
    const qrSelectors = [
      'canvas[aria-label="Scan me!"]',
      'div[data-ref] canvas',
      'canvas',
      'div[data-testid="qrcode"] canvas'
    ];
    
    let qrElement = null;
    for (const selector of qrSelectors) {
      qrElement = await page.$(selector).catch(() => null);
      if (qrElement) break;
    }
    
    const timestamp = Date.now();
    let imagePath;
    
    if (qrElement) {
      // Intentar capturar el contenedor padre para mayor tamaño
      let elementToCapture = qrElement;
      const parent = await qrElement.$('xpath=..').catch(() => null);
      if (parent) {
        const parentBox = await parent.boundingBox().catch(() => null);
        if (parentBox && parentBox.width > 100 && parentBox.height > 100) {
          elementToCapture = parent;
          console.log('Using parent container for larger capture');
        }
      }
      
      imagePath = `/tmp/whatsapp-qr-${timestamp}.png`;
      await elementToCapture.screenshot({ path: imagePath });
      console.log(`QR screenshot: ${imagePath} (${elementToCapture === qrElement ? 'qr only' : 'container'})`);
    } else {
      // Verificar si la sesión ya está activa
      const sessionActive = await checkSessionActive(browser);
      if (sessionActive) {
        console.log('Session already active!');
        await browser.close();
        return { sessionActive: true };
      }
      
      // Fallback: screenshot completo
      imagePath = `/tmp/whatsapp-full-${timestamp}.png`;
      await page.screenshot({ path: imagePath, fullPage: true });
      console.log(`Full page screenshot: ${imagePath}`);
    }
    
    await browser.close();
    return { imagePath, sessionActive: false };
    
  } catch (error) {
    console.error('Error capturing QR:', error.message);
    await browser.close();
    return { imagePath: null, sessionActive: false };
  }
}

async function main() {
  console.log('WhatsApp Session Manager started');
  console.log(`User data dir: ${USER_DATA_DIR}`);
  
  let lastHash = '';
  let attempts = 0;
  let sessionActive = false;
  
  await sendTelegramMessage('🤖 WhatsApp QR capture iniciado. Escanea el código en WhatsApp → Linked Devices.');
  
  while (attempts < MAX_ATTEMPTS && !sessionActive) {
    attempts++;
    console.log(`\n--- Attempt ${attempts}/${MAX_ATTEMPTS} ---`);
    
    const result = await captureQR();
    
    if (result.sessionActive) {
      console.log('✅ WhatsApp session is active!');
      sessionActive = true;
      await sendTelegramMessage('🎉 ¡WhatsApp conectado! La sesión está activa y persistirá automáticamente.');
      break;
    }
    
    const imagePath = result.imagePath;
    if (!imagePath || !fs.existsSync(imagePath)) {
      console.log('No image captured, waiting 10s...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      continue;
    }
    
    // Calcular hash para detectar cambios
    const fileBuffer = fs.readFileSync(imagePath);
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(fileBuffer).digest('hex');
    
    if (hash !== lastHash) {
      console.log(`New QR detected (hash: ${hash.substring(0, 8)}...)`);
      lastHash = hash;
      
      const caption = `📱 WhatsApp QR - Intento ${attempts}\n\n1. Abre WhatsApp en tu teléfono\n2. Toca ⋮ → Linked Devices\n3. Escanea este código\n\n⚠️ Expira en ~30 segundos`;
      await sendTelegramPhoto(imagePath, caption);
    } else {
      console.log('QR unchanged, skipping send');
    }
    
    // Limpiar
    fs.unlinkSync(imagePath);
    
    // Verificar si la sesión se activó (usando browser separado)
    console.log('Checking if session is active...');
    const testBrowser = await playwrightCore.chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    sessionActive = await checkSessionActive(testBrowser);
    await testBrowser.close();
    
    if (sessionActive) {
      console.log('✅ WhatsApp session activated!');
      await sendTelegramMessage('🎉 ¡WhatsApp conectado! La sesión está activa y persistirá automáticamente.');
      break;
    }
    
    // Esperar antes de siguiente intento
    console.log(`Waiting ${CHECK_INTERVAL/1000} seconds...`);
    await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
  }
  
  if (sessionActive) {
    console.log('WhatsApp session is ready for OpenClaw use.');
    console.log(`Session stored in: ${USER_DATA_DIR}`);
    
    // Configurar OpenClaw para usar esta sesión
    // El plugin WhatsApp ya usa ~/.openclaw/credentials/whatsapp/default/
    // Solo necesitamos reiniciar el gateway
    await sendTelegramMessage('🔄 Configurando OpenClaw para usar la sesión persistente...');
    
    // Verificar si el archivo de credenciales existe
    const credsDir = '/home/ubuntu/.openclaw/credentials/whatsapp';
    if (fs.existsSync(USER_DATA_DIR)) {
      console.log(`Session directory exists: ${fs.readdirSync(USER_DATA_DIR).length} files`);
    }
    
    // Restart gateway to pick up session
    console.log('Restarting OpenClaw gateway...');
    try {
      await execAsync('openclaw gateway restart');
      console.log('Gateway restarted');
    } catch (error) {
      console.error('Error restarting gateway:', error.message);
    }
    
  } else {
    console.log(`Max attempts reached (${MAX_ATTEMPTS})`);
    await sendTelegramMessage('⏰ WhatsApp QR capture terminado por tiempo. Ejecuta de nuevo para reintentar.');
  }
  
  console.log('Session manager finished');
}

if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { captureQR, checkSessionActive };
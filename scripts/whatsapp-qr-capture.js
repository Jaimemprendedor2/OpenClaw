#!/usr/bin/env node

/**
 * WhatsApp QR Capture Script
 * Captures QR from web.whatsapp.com and sends via Telegram
 * Runs in loop until QR is scanned
 */

import { chromium } from 'playwright';
import { writeFile, unlink } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createReadStream, existsSync } from 'fs';
import { basename } from 'path';

const execAsync = promisify(exec);

// Configuración
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8799472381:AAGkpBP_oGE3lzghEFrHe_8CH2RVXu6LvIk';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '5560884037';
const USER_DATA_DIR = process.env.USER_DATA_DIR || '/tmp/whatsapp-session';
const CHECK_INTERVAL = 20000; // 20 segundos
const MAX_ATTEMPTS = 30; // 10 minutos máximo

// Función para enviar imagen por Telegram
async function sendTelegramPhoto(imagePath, caption = 'WhatsApp QR Code') {
  try {
    console.log(`Enviando imagen ${imagePath} a Telegram...`);
    
    // Usar curl para enviar photo
    const command = `curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto" \
      -F "chat_id=${TELEGRAM_CHAT_ID}" \
      -F "photo=@${imagePath}" \
      -F "caption=${caption}"`;
    
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr) {
      console.error('Error enviando a Telegram:', stderr);
      return false;
    }
    
    const result = JSON.parse(stdout);
    if (result.ok) {
      console.log('✅ QR enviado a Telegram');
      return true;
    } else {
      console.error('Error Telegram API:', result);
      return false;
    }
  } catch (error) {
    console.error('Error en sendTelegramPhoto:', error.message);
    return false;
  }
}

// Función para capturar QR
async function captureQR() {
  let browser = null;
  let page = null;
  let qrImagePath = null;
  
  try {
    console.log('🚀 Iniciando browser headless...');
    
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    page = await context.newPage();
    
    console.log('🌐 Navegando a web.whatsapp.com...');
    await page.goto('https://web.whatsapp.com', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Esperar a que aparezca el QR
    console.log('⏳ Esperando QR...');
    const qrSelector = 'canvas[aria-label="Scan me!"]';
    await page.waitForSelector(qrSelector, { timeout: 10000 });
    
    // Tomar screenshot del QR
    const qrElement = await page.$(qrSelector);
    if (!qrElement) {
      throw new Error('No se encontró elemento QR');
    }
    
    qrImagePath = `/tmp/whatsapp-qr-${Date.now()}.png`;
    await qrElement.screenshot({ path: qrImagePath });
    
    console.log(`📸 QR capturado: ${qrImagePath}`);
    
    // Verificar si el QR es válido (no es placeholder vacío)
    const stats = require('fs').statSync(qrImagePath);
    if (stats.size < 1000) {
      console.warn('⚠️ QR parece muy pequeño, puede ser placeholder');
    }
    
    return qrImagePath;
    
  } catch (error) {
    console.error('❌ Error capturando QR:', error.message);
    
    // Si hay error, intentar screenshot de toda la página como fallback
    if (page && !qrImagePath) {
      try {
        qrImagePath = `/tmp/whatsapp-full-${Date.now()}.png`;
        await page.screenshot({ path: qrImagePath, fullPage: true });
        console.log(`📸 Fallback: screenshot completo: ${qrImagePath}`);
        return qrImagePath;
      } catch (screenshotError) {
        console.error('❌ Error en screenshot fallback:', screenshotError.message);
      }
    }
    
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Función para verificar si la sesión está activa (QR desaparece)
async function checkSessionActive() {
  let browser = null;
  
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const context = await browser.newContext({
      userDataDir: USER_DATA_DIR, // Persistir sesión
      viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();
    
    // Intentar navegar rápidamente
    await page.goto('https://web.whatsapp.com', { waitUntil: 'domcontentloaded', timeout: 10000 });
    
    // Verificar si el QR sigue presente
    const qrVisible = await page.$('canvas[aria-label="Scan me!"]').then(el => !!el).catch(() => false);
    
    await browser.close();
    
    // Si no hay QR, probablemente la sesión está activa
    return !qrVisible;
    
  } catch (error) {
    console.error('Error verificando sesión:', error.message);
    if (browser) await browser.close();
    return false;
  }
}

// Función principal
async function main() {
  console.log('🤖 WhatsApp QR Capture iniciado');
  console.log(`📁 User data dir: ${USER_DATA_DIR}`);
  console.log(`💬 Telegram Chat ID: ${TELEGRAM_CHAT_ID}`);
  
  let lastQrHash = null;
  let attempts = 0;
  let sessionActive = false;
  
  while (attempts < MAX_ATTEMPTS && !sessionActive) {
    attempts++;
    console.log(`\n🔄 Intento ${attempts}/${MAX_ATTEMPTS}`);
    
    try {
      // Capturar QR
      const qrImagePath = await captureQR();
      
      if (qrImagePath && existsSync(qrImagePath)) {
        // Calcular hash simple del archivo para detectar cambios
        const fs = require('fs');
        const crypto = require('crypto');
        const fileBuffer = fs.readFileSync(qrImagePath);
        const hash = crypto.createHash('md5').update(fileBuffer).digest('hex');
        
        // Solo enviar si el QR cambió
        if (hash !== lastQrHash) {
          console.log(`🆕 QR cambiado (hash: ${hash.substring(0, 8)}...)`);
          lastQrHash = hash;
          
          // Enviar por Telegram
          const success = await sendTelegramPhoto(
            qrImagePath,
            `WhatsApp QR - Intento ${attempts}\nEscanea este código en WhatsApp → Linked Devices\nExpira en ~30 segundos`
          );
          
          if (!success) {
            console.log('⚠️ Falló el envío a Telegram, continuando...');
          }
        } else {
          console.log('⏭️ QR igual al anterior, no enviar');
        }
        
        // Limpiar archivo temporal
        await unlink(qrImagePath).catch(() => {});
      }
      
      // Esperar antes de verificar de nuevo
      console.log(`⏰ Esperando ${CHECK_INTERVAL/1000} segundos...`);
      await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
      
      // Verificar si la sesión se activó
      sessionActive = await checkSessionActive();
      if (sessionActive) {
        console.log('✅ ¡Sesión de WhatsApp activada! QR escaneado exitosamente.');
        
        // Enviar confirmación
        await sendTelegramMessage('🎉 ¡WhatsApp conectado! La sesión está activa y persistirá en el servidor.');
        break;
      }
      
    } catch (error) {
      console.error('❌ Error en ciclo principal:', error.message);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  if (!sessionActive) {
    console.log(`⏰ Tiempo agotado después de ${MAX_ATTEMPTS} intentos`);
    await sendTelegramMessage('⏰ WhatsApp QR capture terminado por tiempo. Ejecuta de nuevo para reintentar.');
  }
  
  console.log('👋 Script finalizado');
}

// Función auxiliar para enviar mensaje de texto
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

// Ejecutar
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
}

export { captureQR, sendTelegramPhoto };
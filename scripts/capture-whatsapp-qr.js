#!/usr/bin/env node

const playwrightCore = require('/home/ubuntu/.nvm/versions/node/v24.14.1/lib/node_modules/openclaw/node_modules/playwright-core');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const TELEGRAM_BOT_TOKEN = '8799472381:AAGkpBP_oGE3lzghEFrHe_8CH2RVXu6LvIk';
const TELEGRAM_CHAT_ID = '5560884037';
const USER_DATA_DIR = '/tmp/whatsapp-session-openclaw';

async function sendTelegramPhoto(imagePath, caption) {
  try {
    console.log(`Sending ${imagePath} to Telegram...`);
    const command = `curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto" \
      -F "chat_id=${TELEGRAM_CHAT_ID}" \
      -F "photo=@${imagePath}" \
      -F "caption=${caption}"`;
    
    const { stdout, stderr } = await execAsync(command);
    if (stderr) console.error('Telegram stderr:', stderr);
    
    const result = JSON.parse(stdout);
    if (result.ok) {
      console.log('✅ Photo sent to Telegram');
      return true;
    } else {
      console.error('Telegram API error:', result);
      return false;
    }
  } catch (error) {
    console.error('Error sending photo:', error.message);
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
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();
    
    console.log('Navigating to web.whatsapp.com...');
    await page.goto('https://web.whatsapp.com', { waitUntil: 'networkidle', timeout: 30000 });
    
    console.log('Waiting for QR code...');
    
    // Try multiple selectors for QR
    const selectors = [
      'canvas[aria-label="Scan me!"]',
      'div[data-ref] canvas',
      'canvas',
      'div[data-testid="qrcode"] canvas',
      'div[role="button"][tabindex="0"] canvas'
    ];
    
    let qrElement = null;
    for (const selector of selectors) {
      try {
        qrElement = await page.$(selector);
        if (qrElement) {
          console.log(`Found QR with selector: ${selector}`);
          break;
        }
      } catch (e) {}
    }
    
    const timestamp = Date.now();
    let imagePath;
    
    if (qrElement) {
      imagePath = `/tmp/whatsapp-qr-${timestamp}.png`;
      await qrElement.screenshot({ path: imagePath });
      console.log(`QR screenshot saved: ${imagePath}`);
    } else {
      // Fallback: full page screenshot
      imagePath = `/tmp/whatsapp-full-${timestamp}.png`;
      await page.screenshot({ path: imagePath, fullPage: true });
      console.log(`Full page screenshot saved: ${imagePath}`);
    }
    
    await browser.close();
    return imagePath;
    
  } catch (error) {
    console.error('Error capturing QR:', error.message);
    await browser.close();
    return null;
  }
}

async function main() {
  console.log('Starting WhatsApp QR capture...');
  
  let lastHash = '';
  let attempts = 0;
  const maxAttempts = 30;
  
  while (attempts < maxAttempts) {
    attempts++;
    console.log(`\n--- Attempt ${attempts}/${maxAttempts} ---`);
    
    const imagePath = await captureQR();
    if (!imagePath || !fs.existsSync(imagePath)) {
      console.log('Failed to capture image, waiting 10s...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      continue;
    }
    
    // Calculate file hash to detect changes
    const fileBuffer = fs.readFileSync(imagePath);
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(fileBuffer).digest('hex');
    
    if (hash !== lastHash) {
      console.log(`New QR detected (hash: ${hash.substring(0, 8)}...)`);
      lastHash = hash;
      
      const caption = `WhatsApp QR - Attempt ${attempts}\nScan in WhatsApp → Linked Devices\nExpires in ~30 seconds`;
      await sendTelegramPhoto(imagePath, caption);
    } else {
      console.log('QR unchanged, skipping send');
    }
    
    // Clean up
    fs.unlinkSync(imagePath);
    
    // Wait before next attempt
    console.log('Waiting 20 seconds...');
    await new Promise(resolve => setTimeout(resolve, 20000));
  }
  
  console.log('Max attempts reached, stopping.');
}

if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { captureQR };
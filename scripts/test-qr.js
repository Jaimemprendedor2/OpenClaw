import { chromium } from 'playwright';
import { writeFile } from 'fs/promises';

async function testQR() {
  console.log('Testing WhatsApp QR capture...');
  
  const browser = await chromium.launch({
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
    await page.goto('https://web.whatsapp.com', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('Waiting for QR...');
    // Try multiple selectors
    const selectors = [
      'canvas[aria-label="Scan me!"]',
      'div[data-ref] canvas',
      'canvas',
      'div[data-testid="qrcode"]'
    ];
    
    let qrElement = null;
    for (const selector of selectors) {
      qrElement = await page.$(selector).catch(() => null);
      if (qrElement) {
        console.log(`Found QR with selector: ${selector}`);
        break;
      }
    }
    
    if (!qrElement) {
      console.log('No QR found, taking full page screenshot');
      await page.screenshot({ path: '/tmp/whatsapp-test-full.png', fullPage: true });
      console.log('Full screenshot saved to /tmp/whatsapp-test-full.png');
    } else {
      await qrElement.screenshot({ path: '/tmp/whatsapp-test-qr.png' });
      console.log('QR screenshot saved to /tmp/whatsapp-test-qr.png');
    }
    
    // Also check page content
    const html = await page.content();
    await writeFile('/tmp/whatsapp-test.html', html.substring(0, 5000));
    console.log('First 5000 chars of HTML saved');
    
    console.log('Test completed');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

testQR();
#!/usr/bin/env node

const localtunnel = require('localtunnel');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const TELEGRAM_BOT_TOKEN = '8799472381:AAGkpBP_oGE3lzghEFrHe_8CH2RVXu6LvIk';
const TELEGRAM_CHAT_ID = '5560884037';
const PORT = 8080;

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

async function startTunnel() {
  console.log('🌐 Creando tunnel público con localtunnel...');
  
  try {
    // Intentar con subdominio específico primero
    let tunnel;
    try {
      tunnel = await localtunnel({
        port: PORT,
        subdomain: 'openclaw-wa',
        allow_invalid_cert: true
      });
    } catch (subdomainError) {
      console.log('⚠️ Subdominio ocupado, usando aleatorio...');
      tunnel = await localtunnel({
        port: PORT,
        allow_invalid_cert: true
      });
    }
    
    const url = tunnel.url;
    console.log(`✅ Tunnel creado: ${url}`);
    
    const message = `🌐 WhatsApp QR - URL PÚBLICA:\n\n${url}\n\n1. Abre esta URL en tu navegador\n2. Escanea el QR que aparece\n3. La página se actualiza automáticamente\n\n⚠️ Mantén este tunnel abierto hasta escanear el código`;
    
    await sendTelegramMessage(message);
    console.log('📤 URL enviada a Telegram');
    
    // Manejar cierre
    tunnel.on('close', () => {
      console.log('❌ Tunnel cerrado');
      sendTelegramMessage('❌ Tunnel público cerrado. Si aún no escaneaste, necesitas reiniciar.');
      process.exit(1);
    });
    
    // Mantener proceso vivo
    console.log('🔄 Tunnel activo. Presiona Ctrl+C para cerrar.');
    
    // Enviar recordatorio periódico
    setInterval(async () => {
      await sendTelegramMessage(`⏰ WhatsApp QR sigue disponible en:\n${url}\n\nEl QR se actualiza automáticamente.`);
    }, 120000); // Cada 2 minutos
    
    // Manejar Ctrl+C
    process.on('SIGINT', () => {
      console.log('\n🛑 Cerrando tunnel...');
      tunnel.close();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Error creando tunnel:', error.message);
    await sendTelegramMessage(`❌ Error creando tunnel público: ${error.message}\n\nUsa SSH tunnel:\nssh -L 8081:localhost:8080 ubuntu@148.116.107.54`);
    process.exit(1);
  }
}

startTunnel();